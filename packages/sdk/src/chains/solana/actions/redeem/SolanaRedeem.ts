/**
 * Solana Redeem Action
 *
 * Redeems BTC.b → BTC on Solana via Asset Router redeemForBtc.
 * Cross-chain burn, analogous to EVM redeem.
 *
 * **Flow:**
 * IDLE → READY → COMPLETED
 *
 * @module chains/solana/actions/redeem/SolanaRedeem
 */

import { z } from 'zod';

import { StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { NonEvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { RedeemEventMap } from '../../../../shared/events';
import {
  amountSchema,
  validatePrepareParams } from '../../../../shared/validation';
import { getSolanaTokenAddress, Token } from '../../../../tokens/token-addresses';
import { toSatoshi } from '../../../../utils/satoshi';
import { envToSolanaChain, envToSolanaNetwork } from '../../utils';
import { isRedeemSupported, solanaRedeemConfig } from './config';
import type {
  ISolanaRedeem,
  SolanaRedeemParams,
  SolanaRedeemPrepareParams } from './types';

export class SolanaRedeem
  extends BaseAction<RedeemEventMap, NonEvmOperationStatus>
  implements ISolanaRedeem
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;

  constructor(
    private readonly ctx: SolanaCoreContext,
    private readonly params: SolanaRedeemParams,
  ) {
    super(NonEvmOperationStatus.IDLE);

    if (
      !isRedeemSupported(
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

  async prepare(params: SolanaRedeemPrepareParams): Promise<void> {
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

      const btcbMint: string | undefined = getSolanaTokenAddress(
        envToSolanaChain(this.ctx.env),
        this.ctx.env,
        Token.BTCb,
      );
      if (!btcbMint) {
        throw LombardError.missingParameter('Solana BTC.b mint for this environment');
      }

      const { signature } = await this.ctx.solana.redeemForBtc({
        amount: amountInSatoshis,
        btcAddress: recipient,
        network,
        env: this.ctx.env,
        tokenMint: btcbMint });

      this._txHash = signature;

      this.emitProgress({
        status: NonEvmOperationStatus.COMPLETED,
        steps: { burning: StepStatus.COMPLETE, releasing: StepStatus.COMPLETE } });

      this.emitCompleted();

      return { txHash: signature };
    }, NonEvmOperationStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: amountSchema,
      recipient: solanaRedeemConfig.recipientSchema });
  }
}
