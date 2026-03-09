/**
 * Solana Redeem Action
 *
 * Redeems BTC.b on Solana → BTC on Bitcoin via Asset Router + GMP.
 *
 * **Flow:**
 * IDLE → READY → CONFIRMING
 *
 * The flow ends at CONFIRMING because the Solana-side burn and GMP dispatch
 * are complete, but the Bitcoin-side BTC release is a cross-chain async
 * process that the SDK cannot track.
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
import { toSatoshi } from '../../../../utils/satoshi';
import { envToSolanaNetwork } from '../../utils';
import { isRedeemSupported, solanaRedeemConfig } from './config';
import type {
  ISolanaRedeem,
  SolanaRedeemParams,
  SolanaRedeemPrepareParams,
} from './types';


export class SolanaRedeem
  extends BaseAction<RedeemEventMap, NonEvmUnstakeStatus>
  implements ISolanaRedeem
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;
  private readonly env: Env;

  constructor(
    private readonly ctx: SolanaCoreContext,
    private readonly params: SolanaRedeemParams,
  ) {
    super(NonEvmUnstakeStatus.IDLE);
    this.env = ctx.env;

    if (
      !isRedeemSupported(
        params.sourceChain,
        params.destChain,
        params.assetIn,
        params.assetOut,
        this.env,
      )
    ) {
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

  get recipient(): string | undefined {
    return this._recipient;
  }

  get txHash(): string | undefined {
    return this._txHash;
  }

  async prepare(params: SolanaRedeemPrepareParams): Promise<void> {
    this.assertStatus(NonEvmUnstakeStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params, {
        destChain: this.params.destChain,
      });
      this._amount = validated.amount;
      this._recipient = validated.recipient;

      this.emitProgress({
        status: NonEvmUnstakeStatus.READY,
        steps: { burning: StepStatus.IDLE, releasing: StepStatus.IDLE },
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
        steps: { burning: StepStatus.PENDING, releasing: StepStatus.IDLE },
      });

      const amountInSatoshis = toSatoshi(amount).toString();
      const network = envToSolanaNetwork(this.env);

      const { txHash } = await this.ctx.solana.redeemForBtc({
        amount: amountInSatoshis,
        btcAddress: recipient,
        network,
        env: this.env,
      });

      this._txHash = txHash;

      // Solana burn is confirmed and the GMP message has been dispatched.
      // The Bitcoin-side release is a cross-chain async process that the SDK
      // cannot track, so the flow stops at CONFIRMING rather than COMPLETED.
      this.emitProgress({
        status: NonEvmUnstakeStatus.CONFIRMING,
        steps: { burning: StepStatus.COMPLETE, releasing: StepStatus.PENDING },
      });

      return { txHash };
    }, NonEvmUnstakeStatus.CONFIRMING);
  }

  private get prepareSchema() {
    return z.object({
      amount: amountSchema,
      recipient: solanaRedeemConfig.recipientSchema,
    });
  }
}
