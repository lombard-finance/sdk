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
 * EVM Redeem does NOT require network fee authorization on any source chain.
 * The destination is the Bitcoin network — there is no auto-mint operation on
 * an EVM destination, so the auto-mint fee model (used by BTC Deposit and
 * EVM Unstake to BTC.b on Ethereum/Sepolia) does not apply here.
 *
 * **Flow (all source chains):**
 * IDLE → READY → COMPLETED
 *
 * `authorizeFee()` is kept on the action only to preserve the existing public
 * interface; it is a safe no-op and the status will never reach
 * `NEEDS_FEE_AUTHORIZATION`.
 *
 * @module chains/evm/actions/withdraw-btcb/EvmWithdrawBtcb
 */

import type { EIP1193Provider } from 'viem';
import { z } from 'zod';

import type { ChainId } from '../../../../common/chains';
import { redeemToken } from '../../../../contract-functions';
import { parseChainIdentifier, StepStatus } from '../../../../core';
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
import { Token } from '../../../../tokens/token-addresses';
import {
  createInitialFeeAuthState,
  type FeeAuthState,
} from '../../shared/feeAuth';
import { evmConfig } from './config';
import type {
  EvmWithdrawBtcbParams,
  EvmWithdrawBtcbPrepareParams,
  IEvmWithdrawBtcb,
} from './types';

export class EvmWithdrawBtcb
  extends BaseAction<ActionEventMap, EvmOperationStatus>
  implements IEvmWithdrawBtcb
{
  private _amount?: string;
  private _recipient?: string;
  private _needsApproval = false;
  private _txHash?: string;
  private _feeAuth: FeeAuthState = createInitialFeeAuthState();

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmWithdrawBtcbParams,
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

  /** Fee authorization state (for UI display) */
  get feeAuth(): FeeAuthState {
    return this._feeAuth;
  }

  async prepare(params: EvmWithdrawBtcbPrepareParams): Promise<void> {
    this.assertStatus(EvmOperationStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params, {
        destChain: this.params.destChain,
      });
      this._amount = validated.amount as string;
      this._recipient = validated.recipient as string;

      // EVM Redeem releases native BTC on the Bitcoin network. There is no
      // EVM auto-mint on the destination, so the network-fee authorization
      // model used by BTC Deposit / EVM Unstake-to-BTC.b does not apply.
      this._needsApproval = false;
      this.emitProgress({
        status: EvmOperationStatus.READY,
        steps: { burning: StepStatus.IDLE, releasing: StepStatus.IDLE },
      });
    }, EvmOperationStatus.READY);
  }

  /**
   * The ceremonies this route can need, mapped from the status that calls for
   * them. `authorize()` on the base class dispatches through this, so
   * `approve()` and `authorizeFee()` keep working while callers move to the one method.
   */
  protected override authorizationHandlers(): Partial<
    Record<EvmOperationStatus, () => Promise<void>>
  > {
    return {
      [EvmOperationStatus.NEEDS_APPROVAL]: () => this.approve(),
      [EvmOperationStatus.NEEDS_FEE_AUTHORIZATION]: () => this.authorizeFee(),
    };
  }

  /**
   * Authorize the network fee
   *
   * @deprecated EVM Redeem no longer requires fee authorization. The status
   * machine never reaches `NEEDS_FEE_AUTHORIZATION`, so this method is a
   * safe no-op kept only for backwards compatibility with the existing
   * public interface. Calling it on a `READY` (or any other) status will
   * resolve immediately without touching the wallet, the API, or the action
   * state.
   */
  async authorizeFee(): Promise<void> {
    // Intentionally a no-op: fee authorization is not part of the EVM Redeem
    // flow anymore. Legacy callers can keep invoking this method without
    // hitting a status-assertion error.
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
