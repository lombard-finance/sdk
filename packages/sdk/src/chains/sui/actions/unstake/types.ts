/**
 * Sui Unstake Action Types
 *
 * @module chains/sui/actions/unstake/types
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
 * Sui Unstake parameters
 */
export interface SuiUnstakeParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

/**
 * Sui Unstake progress
 */
export interface SuiUnstakeProgress
  extends StrategyProgress<NonEvmOperationStatus> {
  status: NonEvmOperationStatus;
  steps: {
    burning: StepStatus;
    releasing: StepStatus;
  };
  txHash?: string;
}

/**
 * Sui Unstake prepare params
 */
export interface SuiUnstakePrepareParams {
  amount: string;
  recipient: string;
}

/**
 * Sui Unstake interface
 */
export interface ISuiUnstake extends MonitorableAction {
  readonly status: NonEvmOperationStatus;
  readonly amount?: string;
  readonly recipient?: string;

  prepare(params: SuiUnstakePrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
