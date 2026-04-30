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
import { NonEvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { UnstakeEventMap } from '../../../../shared/events';
import {
  amountSchema,
  validatePrepareParams } from '../../../../shared/validation';
import { getSolanaTokenAddress,Token } from '../../../../tokens/token-addresses';
import { toSatoshi } from '../../../../utils/satoshi';
import { envToSolanaChain, envToSolanaNetwork } from '../../utils';
import {
  isUnstakeSupported,
  solanaToBtcbConfig,
  solanaToBtcConfig } from './config';
import type {
  ISolanaUnstake,
  SolanaUnstakeParams,
  SolanaUnstakePrepareParams } from './types';

export class SolanaUnstake
  extends BaseAction<UnstakeEventMap, NonEvmOperationStatus>
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
    super(NonEvmOperationStatus.IDLE);

    this.isBtcbOutput = params.assetOut === AssetId.BTCb;

    if (
      !isUnstakeSupported(
        params.sourceChain,
        params.destChain,
        params.assetIn,
        params.assetOut,
        ctx.env,
      )
    ) {
      throw LombardError.routeNotFound({
        assetOut: params.assetOut,
        sourceChain: params.sourceChain,
        destChain: params.destChain,
        env: ctx.env });
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
    this.assertStatus(NonEvmOperationStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params, {
        destChain: this.params.destChain });
      this._amount = validated.amount;
      this._recipient = validated.recipient;

      this.emitProgress({
        status: NonEvmOperationStatus.READY,
        steps: { burning: StepStatus.IDLE, releasing: StepStatus.IDLE } });
    }, NonEvmOperationStatus.READY);
  }

  async execute(): Promise<{ txHash: string }> {
    this.assertStatus(NonEvmOperationStatus.READY, 'execute');

    return this.act(async () => {
      const amount = this._amount;
      const recipient = this._recipient;

      if (!amount || !recipient) {
        throw LombardError.missingParameter('amount or recipient');
      }

      this.emitProgress({
        status: NonEvmOperationStatus.READY,
        steps: { burning: StepStatus.PENDING, releasing: StepStatus.IDLE } });

      const amountInSatoshis = toSatoshi(amount).toString();
      const network = envToSolanaNetwork(this.ctx.env);

      let signature: string;
      if (this.isBtcbOutput) {
        ({ signature } = await this.ctx.solana.redeem({
          amount: amountInSatoshis,
          recipient,
          network,
          env: this.ctx.env }));
      } else {
        const tokenMint = getSolanaTokenAddress(
          envToSolanaChain(this.ctx.env),
          this.ctx.env,
          Token.LBTC,
        );
        if (!tokenMint) {
          throw LombardError.missingParameter(
            'Solana LBTC mint for this environment',
          );
        }
        ({ signature } = await this.ctx.solana.redeemForBtc({
          amount: amountInSatoshis,
          btcAddress: recipient,
          network,
          env: this.ctx.env,
          tokenMint }));
      }

      this._txHash = signature;

      this.emitProgress({
        status: NonEvmOperationStatus.COMPLETED,
        steps: { burning: StepStatus.COMPLETE, releasing: StepStatus.COMPLETE } });

      this.emitCompleted();

      return { txHash: signature };
    }, NonEvmOperationStatus.COMPLETED);
  }

  private get prepareSchema() {
    const config = this.isBtcbOutput ? solanaToBtcbConfig : solanaToBtcConfig;
    return z.object({
      amount: amountSchema,
      recipient: config.recipientSchema });
  }
}
