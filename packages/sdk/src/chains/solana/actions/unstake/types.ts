/**
 * Solana Unstake Action Types
 *
 * @module chains/solana/actions/unstake/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { NonEvmUnstakeStatus } from '../../../../shared/constants/statusConstants';

/**
 * Solana Unstake parameters
 */
export interface SolanaUnstakeParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

/**
 * Solana Unstake progress
 */
export interface SolanaUnstakeProgress
  extends StrategyProgress<NonEvmUnstakeStatus> {
  status: NonEvmUnstakeStatus;
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
export interface SolanaUnstakePrepareParams {
  amount: string;
  recipient: string;
}

/**
 * Solana Unstake interface
 */
export interface ISolanaUnstake extends MonitorableAction {
  readonly status: NonEvmUnstakeStatus;
  readonly amount?: string;
  readonly recipient?: string;

  prepare(params: SolanaUnstakePrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
