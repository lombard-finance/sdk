/**
 * Solana Unstake Action
 *
 * Burns LBTC on Solana and releases BTC on Bitcoin.
 *
 * @module chains/solana/actions/unstake/SolanaUnstake
 */

import type { Env } from "@lombard.finance/sdk-common";
import { z } from "zod";

import { StepStatus } from "../../../../core";
import { BaseAction } from "../../../../shared/actions/BaseAction";
import { NonEvmUnstakeStatus } from "../../../../shared/constants/statusConstants";
import type { SolanaCoreContext } from "../../../../shared/context";
import { LombardError } from "../../../../shared/errors";
import type { UnstakeEventMap } from "../../../../shared/events";
import {
  amountSchema,
  validatePrepareParams,
} from "../../../../shared/validation";
import { toSatoshi } from "../../../../utils/satoshi";
import { isBtcUnstakeSupported, solanaToBtcConfig } from "./config";
import type {
  ISolanaUnstake,
  SolanaUnstakeParams,
  SolanaUnstakePrepareParams,
} from "./types";

/**
 * Map environment to Solana network
 */
function envToSolanaNetwork(env: Env): string {
  switch (env) {
    case "prod":
      return "mainnet-beta";
    case "testnet":
      return "testnet";
    case "stage":
    case "dev":
    case "ibc":
    default:
      return "devnet";
  }
}

export class SolanaUnstake
  extends BaseAction<UnstakeEventMap, NonEvmUnstakeStatus>
  implements ISolanaUnstake
{
  private _amount?: string;
  private _recipient?: string;
  private _txHash?: string;
  private readonly env: Env;

  constructor(
    private readonly ctx: SolanaCoreContext,
    private readonly params: SolanaUnstakeParams,
  ) {
    super(NonEvmUnstakeStatus.IDLE);
    this.env = ctx.env;

    // Validate route is supported
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

  async prepare(params: SolanaUnstakePrepareParams): Promise<void> {
    this.assertStatus(NonEvmUnstakeStatus.IDLE, "prepare");

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
    this.assertStatus(NonEvmUnstakeStatus.READY, "execute");

    return this.act(async () => {
      const amount = this._amount;
      const recipient = this._recipient;

      if (!amount || !recipient) {
        throw LombardError.missingParameter("amount or recipient");
      }

      // Emit burning step
      this.emitProgress({
        status: NonEvmUnstakeStatus.READY,
        steps: { burning: StepStatus.PENDING, releasing: StepStatus.IDLE },
      });

      // Convert amount to base units (satoshis)
      const amountInSatoshis = toSatoshi(amount).toString();
      const network = envToSolanaNetwork(this.env);

      // Call the Solana service to execute unstake
      const { txHash } = await this.ctx.solana.unstake({
        amount: amountInSatoshis,
        btcAddress: recipient,
        network,
      });

      this._txHash = txHash;

      // Emit completed steps
      this.emitProgress({
        status: NonEvmUnstakeStatus.COMPLETED,
        steps: { burning: StepStatus.COMPLETE, releasing: StepStatus.PENDING },
      });

      this.emitCompleted();

      return { txHash };
    }, NonEvmUnstakeStatus.COMPLETED);
  }

  private get prepareSchema() {
    return z.object({
      amount: amountSchema,
      recipient: solanaToBtcConfig.recipientSchema,
    });
  }
}
