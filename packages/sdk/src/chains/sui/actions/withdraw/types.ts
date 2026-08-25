/**
 * Sui Unstake Action Types
 *
 * @module chains/sui/actions/withdraw/types
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
export interface SuiWithdrawParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

/**
 * Sui Unstake progress
 */
export interface SuiWithdrawProgress extends StrategyProgress<NonEvmOperationStatus> {
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
export interface SuiWithdrawPrepareParams {
  amount: string;
  recipient: string;
}

/**
 * Sui Unstake interface
 */
export interface ISuiWithdraw extends MonitorableAction {
  readonly status: NonEvmOperationStatus;
  readonly amount?: string;
  readonly recipient?: string;

  prepare(params: SuiWithdrawPrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
