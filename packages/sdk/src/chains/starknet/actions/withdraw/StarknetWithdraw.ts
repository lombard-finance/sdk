/**
 * Starknet Unstake Action
 *
 * Burns LBTC on Starknet and releases BTC on Bitcoin.
 *
 * @module chains/starknet/actions/withdraw/StarknetWithdraw
 */

import type { Env } from '@lombard.finance/sdk-common';
import { z } from 'zod';

import { StepStatus } from '../../../../core';
import type { RouteLabel } from '../../../../core/actions';
import { deriveRouteLabel } from '../../../../core/actions';
import { BaseAction } from '../../../../shared/actions/BaseAction';
import { NonEvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { StarknetCoreContext } from '../../../../shared/context';
import { LombardError } from '../../../../shared/errors';
import type { ActionEventMap } from '../../../../shared/events';
import {
  amountSchema,
  validatePrepareParams,
} from '../../../../shared/validation';
import { isBtcUnstakeSupported, starknetToBtcConfig } from './config';
import type {
  IStarknetWithdraw,
  StarknetWithdrawParams,
  StarknetWithdrawPrepareParams,
} from './types';

export class StarknetWithdraw
  extends BaseAction<ActionEventMap, NonEvmOperationStatus>
  implements IStarknetWithdraw
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;
  private readonly env: Env;

  constructor(
    private readonly ctx: StarknetCoreContext,
    private readonly params: StarknetWithdrawParams,
  ) {
    super(NonEvmOperationStatus.IDLE);
    this.env = ctx.env;

    if (!isBtcUnstakeSupported(params.sourceChain, this.env)) {
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

  /**
   * Which journey this instance is running.
   *
   * Derived from the parameters rather than hardcoded, so the label cannot
   * drift from the route it describes. `LogMeta` carries it into
   * `toSentryContext()`, which is what lets a log line say which journey
   * failed now that one class can cover several.
   */
  get route(): RouteLabel {
    return deriveRouteLabel({
      assetIn: this.params.assetIn,
      assetOut: this.params.assetOut,
    });
  }

  async prepare(params: StarknetWithdrawPrepareParams): Promise<void> {
    this.assertStatus(NonEvmOperationStatus.IDLE, 'prepare');

    return this.act(async () => {
      const validated = validatePrepareParams(this.prepareSchema, params, {
        destChain: this.params.destChain,
      });
      this._amount = validated.amount;
      this._recipient = validated.recipient;

      this.emitProgress({
        status: NonEvmOperationStatus.READY,
        steps: { burning: StepStatus.IDLE, releasing: StepStatus.IDLE },
      });
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
        steps: { burning: StepStatus.PENDING, releasing: StepStatus.IDLE },
      });

      // Call the Starknet service to execute unstake
      const { txHash } = await this.ctx.starknet.unstake({
        amount,
        btcAddress: recipient,
        env: this.env,
      });

      this._txHash = txHash;

      // Emit completed steps
      this.emitProgress({
        status: NonEvmOperationStatus.COMPLETED,
        steps: { burning: StepStatus.COMPLETE, releasing: StepStatus.PENDING },
      });

      this.emitCompleted();

      return { txHash };
    }, NonEvmOperationStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: amountSchema,
      recipient: starknetToBtcConfig.recipientSchema,
    });
  }
}
