/**
 * EVM Deposit Action
 *
 * Claims LBTC from a notarized BTC deposit.
 *
 * Flow:
 * 1. BTC is deposited to Lombard's BTC address (via BtcDepositBtcb/BtcDepositLbtc)
 * 2. Deposit is notarized by the consortium
 * 3. User claims LBTC using setClaimData() + execute()
 *
 * @module chains/evm/actions/claim/EvmClaim
 */

import type { EIP1193Provider } from 'viem';
import { z } from 'zod';

import type { ChainId } from '../../../../common/chains';
import { claimLBTC } from '../../../../contract-functions';
import { parseChainIdentifier, StepStatus } from '../../../../core';
import type { RouteLabel } from '../../../../core/actions';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import type { EvmCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { ActionEventMap } from '../../../../shared/events';
import {
  evmAmountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { evmConfig } from './config';
import {
  type EvmClaimParams,
  type EvmClaimPrepareParams,
  EvmClaimStatus,
  type IEvmClaim,
} from './types';

export class EvmClaim
  extends BaseAction<ActionEventMap, EvmClaimStatus>
  implements IEvmClaim
{
  private _amount?: string;
  private _recipient?: string;
  private _needsApproval = false;
  private _txHash?: string;
  private _claimData?: { data: string; proofSignature: string };

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmClaimParams,
  ) {
    super(EvmClaimStatus.IDLE);
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

  setClaimData(data: string, proofSignature: string): void {
    this._claimData = { data, proofSignature };
  }

  /**
   * Which journey this instance is running. Claiming an already-notarised mint moves no asset between chains.
   */
  get route(): RouteLabel {
    return 'claim';
  }

  async prepare(params: EvmClaimPrepareParams): Promise<void> {
    this.assertStatus(EvmClaimStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params, {
        destChain: this.params.destChain,
      });
      this._amount = validated.amount;
      this._recipient = validated.recipient;

      this._needsApproval = false;
      this.emitProgress({
        status: EvmClaimStatus.READY,
        steps: {
          approval: StepStatus.COMPLETE,
          execution: StepStatus.IDLE,
          bridging: StepStatus.IDLE,
        },
      });
    }, EvmClaimStatus.READY);
  }

  /**
   * The ceremonies this route can need, mapped from the status that calls for
   * them. `authorize()` on the base class dispatches through this, so
   * `approve()` keep working while callers move to the one method.
   */
  protected override authorizationHandlers(): Partial<
    Record<EvmClaimStatus, () => Promise<void>>
  > {
    return {
      [EvmClaimStatus.NEEDS_APPROVAL]: () => this.approve(),
    };
  }

  /**
   * Approve the token spend.
   *
   * @deprecated A safe no-op on this route. `prepare()` sets `needsApproval`
   * false and goes straight to `READY` — the claim mints against a notarized
   * payload and moves nothing the contract needs an allowance for — so the
   * status this used to assert is one the route never reaches, and the call
   * always threw.
   *
   * That mattered because callers narrowing a union by capability write
   * `if ('approve' in action) await action.approve()`. Resolving quietly is what
   * makes that shape safe here, matching `EvmWithdrawBtcb`.
   */
  async approve(): Promise<void> {
    // Intentionally a no-op: there is no allowance for the caller to grant.
  }

  async execute(): Promise<{ txHash: string }> {
    this.assertStatus(EvmClaimStatus.READY, 'execute');

    if (!this._claimData) {
      throw LombardError.missingParameter('claimData');
    }

    return this.act(async () => {
      const provider = await this.ctx.getProvider('evm');
      if (!provider) {
        throw LombardError.providerMissing(this.params.sourceChain, 'evm');
      }

      const chainId = parseChainIdentifier(this.params.destChain) as ChainId;

      this.emitProgress({
        status: EvmClaimStatus.READY,
        steps: {
          approval: StepStatus.COMPLETE,
          execution: StepStatus.PENDING,
          bridging: StepStatus.IDLE,
        },
      });

      const txHash = await claimLBTC({
        provider: provider as EIP1193Provider,
        account: this._recipient! as `0x${string}`,
        data: this._claimData!.data,
        proofSignature: this._claimData!.proofSignature,
        chainId,
        env: this.ctx.env,
      });

      this._txHash = txHash;

      this.emitProgress({
        status: EvmClaimStatus.COMPLETED,
        steps: {
          approval: StepStatus.COMPLETE,
          execution: StepStatus.COMPLETE,
          bridging: StepStatus.IDLE,
        },
      });

      this.emitCompleted();

      return { txHash };
    }, EvmClaimStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: evmAmountSchema,
      recipient: evmConfig.addressSchema,
    });
  }
}
