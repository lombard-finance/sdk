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
import type { NonEvmUnstakeStatus } from '../../../../shared/constants/statusConstants';

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
  extends StrategyProgress<NonEvmUnstakeStatus> {
  status: NonEvmUnstakeStatus;
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
  readonly status: NonEvmUnstakeStatus;
  readonly amount?: string;
  readonly recipient?: string;

  prepare(params: StarknetUnstakePrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
