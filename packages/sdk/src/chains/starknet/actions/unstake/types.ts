/**
 * Starknet Unstake Action Types
 *
 * @module chains/starknet/actions/unstake/types
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
 * Starknet Unstake parameters
 */
export interface StarknetUnstakeParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

/**
 * Starknet Unstake progress
 */
export interface StarknetUnstakeProgress
  extends StrategyProgress<NonEvmOperationStatus> {
  status: NonEvmOperationStatus;
  steps: {
    burning: StepStatus;
    releasing: StepStatus;
  };
  txHash?: string;
}

/**
 * Starknet Unstake prepare params
 */
export interface StarknetUnstakePrepareParams {
  amount: string;
  recipient: string;
}

/**
 * Starknet Unstake interface
 */
export interface IStarknetUnstake extends MonitorableAction {
  readonly status: NonEvmOperationStatus;
  readonly amount?: string;
  readonly recipient?: string;

  prepare(params: StarknetUnstakePrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
