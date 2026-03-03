/**
 * Solana Stake Action Types
 *
 * @module chains/solana/actions/stake/types
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
 * Solana Stake parameters
 */
export interface SolanaStakeParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

/**
 * Solana Stake progress
 */
export interface SolanaStakeProgress
  extends StrategyProgress<NonEvmUnstakeStatus> {
  status: NonEvmUnstakeStatus;
  steps: {
    staking: StepStatus;
  };
  txHash?: string;
}

/**
 * Solana Stake prepare params
 */
export interface SolanaStakePrepareParams {
  amount: string;
}

/**
 * Solana Stake interface
 */
export interface ISolanaStake extends MonitorableAction {
  readonly status: NonEvmUnstakeStatus;
  readonly amount?: string;
  readonly txHash?: string;

  prepare(params: SolanaStakePrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
