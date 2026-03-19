/**
 * Solana Unstake Action
 *
 * Burns LBTC on Solana and outputs BTC or BTC.b depending on `assetOut`.
 *
 * - LBTC → BTC  (cross-chain): via Asset Router redeemForBtc with LBTC mint
 * - LBTC → BTC.b (same-chain): via Asset Router redeem
 *
 * @module chains/solana/actions/unstake/SolanaUnstake
 */

import { z } from 'zod';

import { AssetId, StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { NonEvmUnstakeStatus } from '../../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { UnstakeEventMap } from '../../../../shared/events';
import {
  amountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { Token, getSolanaTokenAddress } from '../../../../tokens/token-addresses';
import { toSatoshi } from '../../../../utils/satoshi';
import { envToSolanaChain, envToSolanaNetwork } from '../../utils';
import {
  isUnstakeSupported,
  solanaToBtcbConfig,
  solanaToBtcConfig,
} from './config';
import type {
  ISolanaUnstake,
  SolanaUnstakeParams,
  SolanaUnstakePrepareParams,
} from './types';

export class SolanaUnstake
  extends BaseAction<UnstakeEventMap, NonEvmUnstakeStatus>
  implements ISolanaUnstake
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;
  private readonly isBtcbOutput: boolean;

  constructor(
    private readonly ctx: SolanaCoreContext,
    private readonly params: SolanaUnstakeParams,
  ) {
    super(NonEvmUnstakeStatus.IDLE);

    this.isBtcbOutput = params.assetOut === AssetId.BTCb;

    if (
      !isUnstakeSupported(
        params.sourceChain,
        params.assetIn,
        params.assetOut,
        ctx.env,
      )
    ) {
      throw LombardError.routeNotFound({
        assetOut: params.assetOut,
        sourceChain: params.sourceChain,
        destChain: params.destChain,
        env: ctx.env,
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

  async prepare(params: SolanaUnstakePrepareParams): Promise<void> {
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
      const network = envToSolanaNetwork(this.ctx.env);

      const { txHash } = this.isBtcbOutput
        ? await this.ctx.solana.redeem({
            amount: amountInSatoshis,
            recipient,
            network,
            env: this.ctx.env,
          })
        : await this.ctx.solana.redeemForBtc({
            amount: amountInSatoshis,
            btcAddress: recipient,
            network,
            env: this.ctx.env,
            tokenMint: getSolanaTokenAddress(
              envToSolanaChain(this.ctx.env),
              this.ctx.env,
              Token.LBTC,
            ),
          });

      this._txHash = txHash;

      this.emitProgress({
        status: NonEvmUnstakeStatus.COMPLETED,
        steps: { burning: StepStatus.COMPLETE, releasing: StepStatus.PENDING },
      });

      this.emitCompleted();

      return { txHash };
    }, NonEvmUnstakeStatus.COMPLETED);
  }

  private get prepareSchema() {
    const config = this.isBtcbOutput ? solanaToBtcbConfig : solanaToBtcConfig;
    return z.object({
      amount: amountSchema,
      recipient: config.recipientSchema,
    });
  }
}
