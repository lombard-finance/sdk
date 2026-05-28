/**
 * EVM Deposit Action
 *
 * Claims LBTC from a notarized BTC deposit.
 *
 * Flow:
 * 1. BTC is deposited to Lombard's BTC address (via BtcDeposit/BtcStake)
 * 2. Deposit is notarized by the consortium
 * 3. User claims LBTC using setClaimData() + execute()
 *
 * @module chains/evm/actions/deposit/EvmDeposit
 */

import type { EIP1193Provider } from 'viem';
import { z } from 'zod';

import type { ChainId } from '../../../../common/chains';
import { claimLBTC } from '../../../../contract-functions';
import { parseChainIdentifier, StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import type { EvmCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { DepositEventMap } from '../../../../shared/events';
import {
  evmAmountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { evmConfig } from './config';
import {
  type EvmDepositParams,
  type EvmDepositPrepareParams,
  EvmDepositStatus,
  type IEvmDeposit,
} from './types';

export class EvmDeposit
  extends BaseAction<DepositEventMap, EvmDepositStatus>
  implements IEvmDeposit
{
  private _amount?: string;
  private _recipient?: string;
  private _needsApproval = false;
  private _txHash?: string;
  private _claimData?: { data: string; proofSignature: string };

  constructor(
    private readonly ctx: EvmCoreContext,
    private readonly params: EvmDepositParams,
  ) {
    super(EvmDepositStatus.IDLE);
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

  async prepare(params: EvmDepositPrepareParams): Promise<void> {
    this.assertStatus(EvmDepositStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params, {
        destChain: this.params.destChain,
      });
      this._amount = validated.amount;
      this._recipient = validated.recipient;

      this._needsApproval = false;
      this.emitProgress({
        status: EvmDepositStatus.READY,
        steps: {
          approval: StepStatus.COMPLETE,
          execution: StepStatus.IDLE,
          bridging: StepStatus.IDLE,
        },
      });
    }, EvmDepositStatus.READY);
  }

  async approve(): Promise<void> {
    this.assertStatus(EvmDepositStatus.NEEDS_APPROVAL, 'approve');

    return this.act(async () => {
      this._needsApproval = false;
    }, EvmDepositStatus.READY);
  }

  async execute(): Promise<{ txHash: string }> {
    this.assertStatus(EvmDepositStatus.READY, 'execute');

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
        status: EvmDepositStatus.READY,
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
        rpcUrl: this.ctx.rpcUrls?.[chainId],
      });

      this._txHash = txHash;

      this.emitProgress({
        status: EvmDepositStatus.COMPLETED,
        steps: {
          approval: StepStatus.COMPLETE,
          execution: StepStatus.COMPLETE,
          bridging: StepStatus.IDLE,
        },
      });

      this.emitCompleted();

      return { txHash };
    }, EvmDepositStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: evmAmountSchema,
      recipient: evmConfig.addressSchema,
    });
  }
}
