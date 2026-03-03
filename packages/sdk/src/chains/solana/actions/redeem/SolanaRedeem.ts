/**
 * Solana Redeem Action
 *
 * Redeems LBTC to receive BTC.b via the Solana Asset Router program.
 *
 * **Flow:**
 * IDLE → READY → COMPLETED
 *
 * @module chains/solana/actions/redeem/SolanaRedeem
 */

import type { Env } from '@lombard.finance/sdk-common';
import { z } from 'zod';

import { StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { NonEvmUnstakeStatus } from '../../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { RedeemEventMap } from '../../../../shared/events';
import {
  amountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { isRedeemSupported } from './config';
import type {
  ISolanaRedeem,
  SolanaRedeemParams,
  SolanaRedeemPrepareParams,
} from './types';

function envToSolanaNetwork(env: Env): string {
  switch (env) {
    case 'prod':
      return 'mainnet-beta';
    case 'testnet':
      return 'testnet';
    case 'stage':
    case 'dev':
    case 'ibc':
    default:
      return 'devnet';
  }
}

export class SolanaRedeem
  extends BaseAction<RedeemEventMap, NonEvmUnstakeStatus>
  implements ISolanaRedeem
{
  private _amount?: string;
  private _txHash?: string;
  private readonly env: Env;

  constructor(
    private readonly ctx: SolanaCoreContext,
    private readonly params: SolanaRedeemParams,
  ) {
    super(NonEvmUnstakeStatus.IDLE);
    this.env = ctx.env;

    if (!isRedeemSupported(params.sourceChain, this.env)) {
      throw LombardError.routeNotFound({
        assetOut: params.assetOut,
        sourceChain: params.sourceChain,
        destChain: params.destChain,
        env: this.env,
      });
    }
  }

  get amount(): string | undefined {
    return this._amount;
  }

  get txHash(): string | undefined {
    return this._txHash;
  }

  async prepare(params: SolanaRedeemPrepareParams): Promise<void> {
    this.assertStatus(NonEvmUnstakeStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params);
      this._amount = validated.amount;

      this.emitProgress({
        status: NonEvmUnstakeStatus.READY,
        steps: { redeeming: StepStatus.PENDING },
      });
    }, NonEvmUnstakeStatus.READY);
  }

  async execute(): Promise<{ txHash: string }> {
    this.assertStatus(NonEvmUnstakeStatus.READY, 'execute');

    return this.act(async () => {
      const amount = this._amount;

      if (!amount) {
        throw LombardError.missingParameter('amount');
      }

      this.emitProgress({
        status: NonEvmUnstakeStatus.READY,
        steps: { redeeming: StepStatus.PENDING },
      });

      const _network = envToSolanaNetwork(this.env);

      // TODO: Implement LBTC → BTC.b redeem via Asset Router program
      // Requires IDL for Asset Router (LomVyJDZ91jeVbNnTupJXKJTQFakJVMc87CmwDHYt95)
      // Expected flow:
      // 1. Get/create recipient ATA for BTC.b
      // 2. Call Asset Router's redeem instruction (burn LBTC, mint BTC.b)
      throw new Error(
        'SolanaRedeem.execute() not yet implemented — awaiting Asset Router IDL',
      );
    }, NonEvmUnstakeStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: amountSchema,
    });
  }
}
