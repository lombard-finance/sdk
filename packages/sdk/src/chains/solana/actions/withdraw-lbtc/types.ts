/**
 * Solana Unstake Action Types
 *
 * @module chains/solana/actions/withdraw-lbtc/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { NonEvmOperationStatus } from '../../../../shared/constants/statusConstants';

/**
 * Solana Unstake parameters
 */
export interface SolanaWithdrawLbtcParams {
  /** Input asset (LBTC). A literal, so `withdraw()` can dispatch on it. */
  assetIn: typeof AssetId.LBTC;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

/**
 * Solana Unstake progress
 */
export interface SolanaWithdrawLbtcProgress extends StrategyProgress<NonEvmOperationStatus> {
  status: NonEvmOperationStatus;
  steps: {
    burning: StepStatus;
    releasing: StepStatus;
  };
  txHash?: string;
  releaseTxHash?: string;
}

/**
 * Solana Unstake prepare params
 */
export interface SolanaWithdrawLbtcPrepareParams {
  amount: string;
  recipient: string;
}

/**
 * Solana Unstake interface
 */
export interface ISolanaWithdrawLbtc extends MonitorableAction {
  readonly status: NonEvmOperationStatus;
  readonly amount?: string;
  readonly recipient?: string;

  prepare(params: SolanaWithdrawLbtcPrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
