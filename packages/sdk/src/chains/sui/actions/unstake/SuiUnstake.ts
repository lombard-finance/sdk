/**
 * Sui Unstake Action
 *
 * Burns LBTC on Sui and releases BTC on Bitcoin.
 *
 * @module chains/sui/actions/unstake/SuiUnstake
 */

import type { Env } from '@lombard.finance/sdk-common';
import { z } from 'zod';

import { Chain, StepStatus } from '../../../../core';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { NonEvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { SuiCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { UnstakeEventMap } from '../../../../shared/events';
import {
  amountSchema,
  validatePrepareParams } from '../../../../shared/validation';
import { isBtcUnstakeSupported,suiToBtcConfig } from './config';
import type {
  ISuiUnstake,
  SuiUnstakeParams,
  SuiUnstakePrepareParams } from './types';

/**
 * Get Sui chain ID from Chain constant
 */
function getSuiChainId(chain: Chain): string {
  switch (chain) {
    case Chain.SUI_MAINNET:
      return 'sui:mainnet';
    case Chain.SUI_TESTNET:
      return 'sui:testnet';
    default:
      return 'sui:testnet';
  }
}

export class SuiUnstake
  extends BaseAction<UnstakeEventMap, NonEvmOperationStatus>
  implements ISuiUnstake
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;
  private readonly env: Env;

  constructor(
    private readonly ctx: SuiCoreContext,
    private readonly params: SuiUnstakeParams,
  ) {
    super(NonEvmOperationStatus.IDLE);
    this.env = ctx.env;

    if (!isBtcUnstakeSupported(params.sourceChain, this.env)) {
      throw LombardError.routeNotFound({
        assetOut: params.assetOut,
        sourceChain: params.sourceChain,
        destChain: params.destChain,
        env: this.env });
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

  async prepare(params: SuiUnstakePrepareParams): Promise<void> {
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

      // Emit burning step
      this.emitProgress({
        status: NonEvmOperationStatus.READY,
        steps: { burning: StepStatus.PENDING, releasing: StepStatus.IDLE } });

      // Get Sui chain ID from source chain
      const chainId = getSuiChainId(this.params.sourceChain);

      // Call the Sui service to execute unstake
      const { txHash } = await this.ctx.sui.unstake({
        amount,
        btcAddress: recipient,
        chainId,
        env: this.env });

      this._txHash = txHash;

      // Emit completed steps
      this.emitProgress({
        status: NonEvmOperationStatus.COMPLETED,
        steps: { burning: StepStatus.COMPLETE, releasing: StepStatus.PENDING } });

      this.emitCompleted();

      return { txHash };
    }, NonEvmOperationStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: amountSchema,
      recipient: suiToBtcConfig.recipientSchema });
  }
}
