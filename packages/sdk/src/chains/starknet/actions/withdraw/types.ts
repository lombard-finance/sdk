/**
 * Starknet Withdraw Action Types
 *
 * @module chains/starknet/actions/withdraw/types
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
 * Starknet Withdraw parameters
 */
export interface StarknetWithdrawParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

/**
 * Starknet Withdraw progress
 */
export interface StarknetWithdrawProgress extends StrategyProgress<NonEvmOperationStatus> {
  status: NonEvmOperationStatus;
  steps: {
    burning: StepStatus;
    releasing: StepStatus;
  };
  txHash?: string;
}

/**
 * Starknet Withdraw prepare params
 */
export interface StarknetWithdrawPrepareParams {
  amount: string;
  recipient: string;
}

/**
 * Starknet Withdraw interface
 */
export interface IStarknetWithdraw extends MonitorableAction {
  readonly status: NonEvmOperationStatus;
  readonly amount?: string;
  readonly recipient?: string;

  prepare(params: StarknetWithdrawPrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
