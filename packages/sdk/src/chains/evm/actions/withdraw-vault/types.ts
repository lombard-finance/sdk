/**
 * EVM Withdraw Action Types
 *
 * @module chains/evm/actions/withdraw-vault/types
 */

import type {
  Chain,
  DeployProtocol,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { LombardError } from '../../../../shared/errors';

// Re-export status for convenience
export { EvmOperationStatus as EvmWithdrawVaultStatus } from '../../../../shared/constants/statusConstants';

/**
 * EVM Withdraw parameters (initial action creation)
 */
export interface EvmWithdrawVaultParams {
  /** Protocol to withdraw from */
  protocol: DeployProtocol;
  /** Source chain where vault shares are held */
  sourceChain: Chain;
  /** Recipient address for withdrawn assets */
  recipient: string;
}

/**
 * EVM Withdraw prepare parameters
 */
export interface EvmWithdrawVaultPrepareParams {
  /** Amount of vault shares to withdraw */
  amount: string;
}

/**
 * EVM Withdraw progress
 */
export interface EvmWithdrawVaultProgress extends StrategyProgress<EvmOperationStatus> {
  status: EvmOperationStatus;
  steps: {
    approval: StepStatus;
    queueing: StepStatus;
  };
  txHash?: string;
}

/**
 * EVM Withdraw interface
 */
export interface IEvmWithdrawVault extends MonitorableAction {
  readonly status: EvmOperationStatus;
  readonly error: LombardError | null;
  readonly amount?: string;
  readonly protocol?: DeployProtocol;
  readonly needsApproval: boolean;
  readonly txHash?: string;

  prepare(params: EvmWithdrawVaultPrepareParams): Promise<void>;
  approve(): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}

/**
 * EVM Cancel Withdraw parameters
 */
export interface EvmCancelWithdrawParams {
  /** Protocol to cancel withdrawal from */
  protocol: DeployProtocol;
  /** Chain where the pending withdrawal exists */
  chain: Chain;
}

/**
 * EVM Cancel Withdraw progress
 */
export interface EvmCancelWithdrawProgress extends StrategyProgress<EvmOperationStatus> {
  status: EvmOperationStatus;
  steps: {
    cancelling: StepStatus;
  };
  txHash?: string;
}

/**
 * EVM Cancel Withdraw interface
 */
export interface IEvmCancelWithdraw extends MonitorableAction {
  readonly status: EvmOperationStatus;
  readonly error: LombardError | null;
  readonly txHash?: string;

  prepare(): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
