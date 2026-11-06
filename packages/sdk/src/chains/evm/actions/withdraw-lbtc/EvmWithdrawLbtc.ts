/**
 * EVM Withdraw Action
 *
 * Burns LBTC on EVM chains and releases BTC (cross-chain) or BTC.b (same-chain).
 *
 * ## Fee Authorization
 *
 * Fee authorization is required when:
 * - Output asset is BTC.b (LBTC → BTC.b conversion)
 * - Source chain is Ethereum/Sepolia (unsubsidized chains)
 *
 * **Flow with fee auth (LBTC → BTC.b on Ethereum/Sepolia):**
 * IDLE → NEEDS_FEE_AUTHORIZATION → READY → COMPLETED
 *
 * **Flow without fee auth (LBTC → BTC, or BTC.b on Base/BSC):**
 * IDLE → READY → COMPLETED
 *
 * @module chains/evm/actions/withdraw-lbtc/EvmWithdrawLbtc
 */

import type { EIP1193Provider } from 'viem';
import { z } from 'zod';

import type { ChainId } from '../../../../common/chains';
import { redeemToken } from '../../../../contract-functions';
import { AssetId, parseChainIdentifier, StepStatus } from '../../../../core';
import type { RouteLabel } from '../../../../core/actions';
import { deriveRouteLabel } from '../../../../core/actions';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { ActionEventMap } from '../../../../shared/events';
import {
  evmAmountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { assertMintingFeeWithinBounds } from '../../../../shared/validation/signing';
import { Token } from '../../../../tokens/token-addresses';
import { toSatoshi } from '../../../../utils/satoshi';
import {
  authorizeFee as authorizeFeeShared,
  checkFeeAuthorization,
  createInitialFeeAuthState,
  type FeeAuthState,
} from '../../shared/feeAuth';
import { evmToBtcbConfig, evmToBtcConfig } from './config';
import type {
  EvmWithdrawLbtcParams,
  EvmWithdrawLbtcPrepareParams,
  IEvmWithdrawLbtc,
} from './types';

export class EvmWithdrawLbtc
  extends BaseAction<ActionEventMap, EvmOperationStatus>
  implements IEvmWithdrawLbtc
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;
  private _feeAuth: FeeAuthState = createInitialFeeAuthState();

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmWithdrawLbtcParams,
  ) {
    super(EvmOperationStatus.IDLE);
  }

  get amount(): string | undefined {
    return this._amount;
  }

  get recipient(): string | undefined {
    return this._recipient;
  }

  get txHash(): string | undefined {
    return this._txHash;
  }

  /** Fee authorization state (for UI display) */
  get feeAuth(): FeeAuthState {
    return this._feeAuth;
  }

  /**
   * Which journey this instance is running.
   *
   * Derived from the parameters rather than hardcoded, so the label cannot
   * drift from the route it describes. `LogMeta` carries it into
   * `toSentryContext()`, which is what lets a log line say which journey
   * failed now that one class can cover several.
   */
  get route(): RouteLabel {
    return deriveRouteLabel({
      assetIn: this.params.assetIn,
      assetOut: this.params.assetOut,
    });
  }

  /** Whether output is BTC.b (requires fee auth on unsubsidized chains) */
  private get isBtcbOutput(): boolean {
    return this.params.assetOut === AssetId.BTCb;
  }

  /**
   * On the BTC.b arm the redeem mints BTC.b to the account that burns the
   * LBTC, so the recipient can only be the connected account. It used to be
   * sent as the transaction's `from`: a wallet that honours another `from`
   * would burn that account's LBTC instead.
   */
  private assertRecipientIsAccount(account: string | undefined): void {
    const recipient = this._recipient;
    if (
      !account ||
      !recipient ||
      recipient.toLowerCase() !== account.toLowerCase()
    ) {
      throw LombardError.invalidParameter(
        'recipient',
        `On the BTC.b route the BTC.b goes to the account that burns the ` +
          `LBTC, so the recipient must be the connected account ` +
          `${String(account)}, not ${String(recipient)}.`,
      );
    }
  }

  async prepare(params: EvmWithdrawLbtcPrepareParams): Promise<void> {
    this.assertStatus(EvmOperationStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params, {
        destChain: this.params.destChain,
      });
      this._amount = validated.amount;
      this._recipient = validated.recipient;

      const chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;

      // Fee auth is only required for BTC.b output on unsubsidized chains
      if (this.isBtcbOutput) {
        // Get EVM account for fee auth check
        const provider = await this.ctx.getProvider('evm');
        if (!provider) {
          throw LombardError.providerMissing(this.params.sourceChain, 'evm');
        }
        const accounts = await (provider as EIP1193Provider).request({
          method: 'eth_accounts',
        });
        const account = accounts[0] as `0x${string}`;
        this.assertRecipientIsAccount(account);

        // Check fee authorization status (use Token.BTCb for LBTC → BTC.b)
        const feeAuthResult = await checkFeeAuthorization(
          chainId,
          account,
          this.ctx.env,
          Token.BTCb,
          { auth: this.ctx.auth, getAuthToken: this.ctx.getAuthToken },
        );

        // Update fee auth state
        this._feeAuth = {
          requiresAuth: feeAuthResult.requiresAuth,
          isAuthorized: feeAuthResult.hasValidSignature,
          feeInSatoshis: feeAuthResult.feeInSatoshis,
          feeFormatted: feeAuthResult.feeFormatted,
          expirationDate: feeAuthResult.expirationDate,
        };

        // If fee auth required and not authorized, transition to NEEDS_FEE_AUTHORIZATION
        // Note: Status is set here (not via act's successStatus) because the
        // fee auth state is only known after the async check completes.
        if (feeAuthResult.requiresAuth && !feeAuthResult.hasValidSignature) {
          this.updateStatus(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);
          this.emitProgress({
            status: EvmOperationStatus.NEEDS_FEE_AUTHORIZATION,
            steps: { burning: StepStatus.IDLE, releasing: StepStatus.IDLE },
          });
          return;
        }
      }

      // No fee auth required or already authorized
      this.updateStatus(EvmOperationStatus.READY);
      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { burning: StepStatus.IDLE, releasing: StepStatus.IDLE },
      });
    });
  }

  /**
   * The ceremonies this route can need, mapped from the status that calls for
   * them. `authorize()` on the base class dispatches through this, so
   * `authorizeFee()` keep working while callers move to the one method.
   */
  protected override authorizationHandlers(): Partial<
    Record<EvmOperationStatus, () => Promise<void>>
  > {
    return {
      [EvmOperationStatus.NEEDS_FEE_AUTHORIZATION]: () => this.authorizeFee(),
    };
  }

  /**
   * Authorize the network fee
   *
   * Must be called when status is NEEDS_FEE_AUTHORIZATION.
   * Signs the fee authorization and stores it on the server.
   */
  async authorizeFee(): Promise<void> {
    this.assertStatus(
      EvmOperationStatus.NEEDS_FEE_AUTHORIZATION,
      'authorizeFee',
    );

    if (!this._feeAuth.feeInSatoshis) {
      throw LombardError.missingParameter('feeInSatoshis');
    }
    const feeInSatoshis = this._feeAuth.feeInSatoshis;

    return this.act(async () => {
      assertMintingFeeWithinBounds(
        feeInSatoshis,
        toSatoshi(this._amount!).toFixed(),
      );
      const chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;

      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      const accounts = await (provider as EIP1193Provider).request({
        method: 'eth_accounts',
      });
      const account = accounts[0] as `0x${string}`;

      // Sign and store fee authorization (use Token.BTCb for LBTC → BTC.b)
      await authorizeFeeShared({
        chainId,
        account,
        feeInSatoshis: this._feeAuth.feeInSatoshis!,
        provider: provider as EIP1193Provider,
        env: this.ctx.env,
        token: Token.BTCb,
        auth: this.ctx.auth,
        getAuthToken: this.ctx.getAuthToken,
      });

      // Update state
      this._feeAuth.isAuthorized = true;

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { burning: StepStatus.IDLE, releasing: StepStatus.IDLE },
      });
    }, EvmOperationStatus.READY);
  }

  async execute(): Promise<{ txHash: string }> {
    this.assertStatus(EvmOperationStatus.READY, 'execute');

    return this.act(async () => {
      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      // Get the connected EVM account address from the provider
      const accounts = await (provider as EIP1193Provider).request({
        method: 'eth_accounts',
      });
      const evmAccount = accounts[0] as `0x${string}`;
      if (!evmAccount) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      const chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;
      const isBtcbOutput = this.params.assetOut === AssetId.BTCb;

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { burning: StepStatus.PENDING, releasing: StepStatus.IDLE },
      });

      // Checked again here: the wallet's account can change after prepare().
      if (isBtcbOutput) this.assertRecipientIsAccount(evmAccount);

      // For BTC output: btcAddress = recipient (Bitcoin). For BTC.b output the
      // BTC.b is minted to the account that burns, which is the recipient.
      const txHash = await redeemToken({
        provider: provider as EIP1193Provider,
        account: evmAccount,
        amount: this._amount!,
        btcAddress: isBtcbOutput ? undefined : this._recipient!,
        chainId,
        env: this.ctx.env,
        tokenIn: Token.LBTC,
        tokenOut: isBtcbOutput ? Token.BTCb : undefined,
      });

      this._txHash = txHash;

      this.emitProgress({
        status: EvmOperationStatus.COMPLETED,
        steps: {
          burning: StepStatus.COMPLETE,
          releasing: isBtcbOutput ? StepStatus.COMPLETE : StepStatus.PENDING,
        },
      });

      this.emitCompleted();

      return { txHash };
    }, EvmOperationStatus.COMPLETED);
  }

  private get prepareSchema() {
    const config =
      this.params.assetOut === AssetId.BTC ? evmToBtcConfig : evmToBtcbConfig;
    return z.object({
      amount: evmAmountSchema,
      recipient: config.recipientSchema,
    });
  }
}
