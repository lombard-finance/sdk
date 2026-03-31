/**
 * Solana Stake Action
 *
 * Stakes BTC.b on Solana → LBTC on Solana via Asset Router + GMP.
 *
 * **Flow:**
 * IDLE → READY → CONFIRMING
 *
 * @module chains/solana/actions/stake/SolanaStake
 */

import type { Env } from '@lombard.finance/sdk-common';
import { z } from 'zod';

import { StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { NonEvmUnstakeStatus } from '../../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { StakeEventMap } from '../../../../shared/events';
import {
  amountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { toSatoshi } from '../../../../utils/satoshi';
import { envToSolanaNetwork } from '../../utils';
import { isStakeSupported, solanaStakeConfig } from './config';
import type {
  ISolanaStake,
  SolanaStakeParams,
  SolanaStakePrepareParams,
} from './types';

export class SolanaStake
  extends BaseAction<StakeEventMap, NonEvmUnstakeStatus>
  implements ISolanaStake
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;
  private readonly env: Env;

  constructor(
    private readonly ctx: SolanaCoreContext,
    private readonly params: SolanaStakeParams,
  ) {
    super(NonEvmUnstakeStatus.IDLE);
    this.env = ctx.env;

    if (
      !isStakeSupported(
        params.chain,
        params.assetIn,
        params.assetOut,
        this.env,
      )
    ) {
      throw LombardError.routeNotFound({
        assetOut: params.assetOut,
        chain: params.chain,
        env: this.env,
      });
    }
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

  async prepare(params: SolanaStakePrepareParams): Promise<void> {
    this.assertStatus(NonEvmUnstakeStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params, {
        destChain: this.params.chain,
      });
      this._amount = validated.amount;
      this._recipient = validated.recipient;

      this.emitProgress({
        status: NonEvmUnstakeStatus.READY,
        steps: { burning: StepStatus.IDLE, minting: StepStatus.IDLE },
      });
    }, NonEvmUnstakeStatus.READY);
  }

  async execute(): Promise<{ txHash: string }> {
    this.assertStatus(NonEvmUnstakeStatus.READY, 'execute');

    return this.act(async () => {
      const amount = this._amount;
      const recipient = this._recipient;

      if (!amount || !recipient) {
        throw LombardError.missingParameter('amount or recipient');
      }

      this.emitProgress({
        status: NonEvmUnstakeStatus.READY,
        steps: { burning: StepStatus.PENDING, minting: StepStatus.IDLE },
      });

      const amountInSatoshis = toSatoshi(amount).toString();
      const network = envToSolanaNetwork(this.env);

      const { signature } = await this.ctx.solana.deposit({
        amount: amountInSatoshis,
        recipient,
        network,
        env: this.env,
      });

      this._txHash = signature;

      this.emitProgress({
        status: NonEvmUnstakeStatus.CONFIRMING,
        steps: { burning: StepStatus.COMPLETE, minting: StepStatus.PENDING },
        txHash: signature,
      });

      return { txHash: signature };
    }, NonEvmUnstakeStatus.CONFIRMING);
  }

  private get prepareSchema() {
    return z.object({
      amount: amountSchema,
      recipient: solanaStakeConfig.recipientSchema,
    });
  }
}
