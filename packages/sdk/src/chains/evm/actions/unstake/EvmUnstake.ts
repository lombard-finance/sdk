/**
 * EVM Unstake Action
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
 * @module chains/evm/actions/unstake/EvmUnstake
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
import type { UnstakeEventMap } from '../../../../shared/events';
import {
  evmAmountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { Token } from '../../../../tokens/token-addresses';
import {
  authorizeFee as authorizeFeeShared,
  checkFeeAuthorization,
  createInitialFeeAuthState,
  type FeeAuthState,
} from '../../shared/feeAuth';
import { evmToBtcbConfig, evmToBtcConfig } from './config';
import type {
  EvmUnstakeParams,
  EvmUnstakePrepareParams,
  IEvmUnstake,
} from './types';

export class EvmUnstake
  extends BaseAction<UnstakeEventMap, EvmOperationStatus>
  implements IEvmUnstake
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;
  private _feeAuth: FeeAuthState = createInitialFeeAuthState();

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmUnstakeParams,
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

  async prepare(params: EvmUnstakePrepareParams): Promise<void> {
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

        // Check fee authorization status (use Token.BTCb for LBTC → BTC.b)
        const feeAuthResult = await checkFeeAuthorization(
          chainId,
          account,
          this.ctx.env,
          Token.BTCb,
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

    return this.act(async () => {
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

      // For BTC output: account = EVM wallet (executing burn), btcAddress = recipient (Bitcoin)
      // For BTCb output: account = recipient (same EVM address receives BTCb)
      const txHash = await redeemToken({
        provider: provider as EIP1193Provider,
        account: isBtcbOutput
          ? (this._recipient! as `0x${string}`)
          : evmAccount,
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
