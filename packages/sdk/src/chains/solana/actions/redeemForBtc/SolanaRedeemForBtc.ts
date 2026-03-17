/**
 * Solana RedeemForBtc Action
 *
 * Redeems BTC.b or LBTC on Solana → BTC on Bitcoin via Asset Router + GMP.
 *
 * **Flow:**
 * IDLE → READY → CONFIRMING
 *
 * The flow ends at CONFIRMING because the Solana-side burn and GMP dispatch
 * are complete, but the Bitcoin-side BTC release is a cross-chain async
 * process that the SDK cannot track.
 *
 * @module chains/solana/actions/redeemForBtc/SolanaRedeemForBtc
 */

import type { Env } from '@lombard.finance/sdk-common';
import { z } from 'zod';

import { AssetId, StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { NonEvmUnstakeStatus } from '../../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { RedeemEventMap } from '../../../../shared/events';
import {
  amountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { Token, getSolanaTokenAddress } from '../../../../tokens/token-addresses';
import { toSatoshi } from '../../../../utils/satoshi';
import { envToSolanaChain, envToSolanaNetwork } from '../../utils';
import { isRedeemForBtcSupported, solanaRedeemForBtcConfig } from './config';
import type {
  ISolanaRedeemForBtc,
  SolanaRedeemForBtcParams,
  SolanaRedeemForBtcPrepareParams,
} from './types';

export class SolanaRedeemForBtc
  extends BaseAction<RedeemEventMap, NonEvmUnstakeStatus>
  implements ISolanaRedeemForBtc
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;
  private readonly env: Env;

  constructor(
    private readonly ctx: SolanaCoreContext,
    private readonly params: SolanaRedeemForBtcParams,
  ) {
    super(NonEvmUnstakeStatus.IDLE);
    this.env = ctx.env;

    if (
      !isRedeemForBtcSupported(
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

  async prepare(params: SolanaRedeemForBtcPrepareParams): Promise<void> {
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

      const tokenMint =
        this.params.assetIn === AssetId.LBTC
          ? getSolanaTokenAddress(envToSolanaChain(this.env), this.env, Token.LBTC)
          : undefined;

      const { txHash } = await this.ctx.solana.redeemForBtc({
        amount: amountInSatoshis,
        btcAddress: recipient,
        network,
        env: this.env,
        tokenMint,
      });

      this._txHash = txHash;

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
      recipient: solanaRedeemForBtcConfig.recipientSchema,
    });
  }
}
