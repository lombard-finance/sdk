/**
 * EVM Redeem Action
 *
 * Redeems BTC.b to native BTC (cross-chain).
 * This is the opposite operation to BTC Deposit.
 *
 * Flow: BTC.b (EVM) → BTC (Bitcoin)
 *
 * ## Fee Authorization
 *
 * On Ethereum/Sepolia, fee authorization is required before redemption.
 * This covers the gas cost of the auto-mint operation on the destination.
 *
 * **Flow with fee auth (Ethereum/Sepolia):**
 * IDLE → NEEDS_FEE_AUTHORIZATION → READY → COMPLETED
 *
 * **Flow without fee auth (Base, BSC - subsidized):**
 * IDLE → READY → COMPLETED
 *
 * @module chains/evm/actions/redeem/EvmRedeem
 */

import type { EIP1193Provider } from 'viem';
import { z } from 'zod';

import type { ChainId } from '../../../../common/chains';
import { redeemToken } from '../../../../contract-functions';
import { parseChainIdentifier, StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { RedeemEventMap } from '../../../../shared/events';
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
import { evmConfig } from './config';
import type {
  EvmRedeemParams,
  EvmRedeemPrepareParams,
  IEvmRedeem,
} from './types';

export class EvmRedeem
  extends BaseAction<RedeemEventMap, EvmOperationStatus>
  implements IEvmRedeem
{
  private _amount?: string;
  private _recipient?: string;
  private _needsApproval = false;
  private _txHash?: string;
  private _feeAuth: FeeAuthState = createInitialFeeAuthState();

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmRedeemParams,
  ) {
    super(EvmOperationStatus.IDLE);
  }

  get amount(): string | undefined {
    return this._amount;
  }

  get recipient(): string | undefined {
    return this._recipient;
  }

  get needsApproval(): boolean {
    return this._needsApproval;
  }

  get txHash(): string | undefined {
    return this._txHash;
  }

  /** Fee authorization state (for UI display) */
  get feeAuth(): FeeAuthState {
    return this._feeAuth;
  }

  async prepare(params: EvmRedeemPrepareParams): Promise<void> {
    this.assertStatus(EvmOperationStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params, {
        destChain: this.params.destChain,
      });
      this._amount = validated.amount as string;
      this._recipient = validated.recipient as string;

      const chainId = parseChainIdentifier(this.params.sourceChain) as ChainId;

      // Get EVM account for fee auth check
      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }
      const accounts = await (provider as EIP1193Provider).request({
        method: 'eth_accounts',
      });
      const account = accounts[0] as `0x${string}`;

      // Check fee authorization status (BTC.b redeem uses Token.BTCb)
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

      // Determine next status based on fee auth
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

      // No fee auth required or already authorized
      this._needsApproval = false;
      this.updateStatus(EvmOperationStatus.READY);
      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { burning: StepStatus.IDLE, releasing: StepStatus.IDLE },
      });
    });
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

      // Sign and store fee authorization
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

  async approve(): Promise<void> {
    this.assertStatus(EvmOperationStatus.NEEDS_APPROVAL, 'approve');

    return this.act(async () => {
      this._needsApproval = false;
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

      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { burning: StepStatus.PENDING, releasing: StepStatus.IDLE },
      });

      // Execute BTC.b → BTC redemption (burn BTC.b, release BTC to Bitcoin address)
      const txHash = await redeemToken({
        provider: provider as EIP1193Provider,
        account: evmAccount,
        amount: this._amount!,
        btcAddress: this._recipient!, // Bitcoin address to receive BTC
        chainId,
        env: this.ctx.env,
        tokenIn: Token.BTCb,
        tokenOut: undefined, // Native BTC output
      });

      this._txHash = txHash;

      this.emitProgress({
        status: EvmOperationStatus.COMPLETED,
        steps: { burning: StepStatus.COMPLETE, releasing: StepStatus.PENDING },
      });

      this.emitCompleted();

      return { txHash };
    }, EvmOperationStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: evmAmountSchema,
      recipient: evmConfig.recipientSchema,
    });
  }
}
