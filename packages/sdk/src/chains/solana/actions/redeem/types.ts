/**
 * Solana Redeem Action Types
 *
 * Redeems BTC.b on Solana → BTC on Bitcoin via Asset Router + GMP.
 *
 * @module chains/solana/actions/redeem/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from "../../../../core";
import type { MonitorableAction } from "../../../../shared/actions/BaseAction";
import type { NonEvmUnstakeStatus } from "../../../../shared/constants/statusConstants";

/**
 * Solana Redeem parameters
 */
export interface SolanaRedeemParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

/**
 * Solana Redeem progress
 */
export interface SolanaRedeemProgress extends StrategyProgress<NonEvmUnstakeStatus> {
  status: NonEvmUnstakeStatus;
  steps: {
    burning: StepStatus;
    releasing: StepStatus;
  };
  txHash?: string;
}

/**
 * Solana Redeem prepare params
 */
export interface SolanaRedeemPrepareParams {
  amount: string;
  /** Bitcoin address to receive BTC */
  recipient: string;
}

/**
 * Solana Redeem interface
 */
export interface ISolanaRedeem extends MonitorableAction {
  readonly status: NonEvmUnstakeStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly txHash?: string;

  prepare(params: SolanaRedeemPrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
