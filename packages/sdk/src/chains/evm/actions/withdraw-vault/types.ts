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
import type { BoringWithdrawRequest } from '../../../../vaults/lib/ops/withdraw';

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
  /**
   * The queue pays the account that files the request and cannot pay anyone
   * else, so this is not a destination. Optional; when given it must be the
   * connected account, and `prepare()` refuses any other address rather than
   * ignore it.
   */
  recipient?: string;
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
  /**
   * The request to cancel: the `request` of an open or expired withdrawal
   * from `getEarnWithdrawals`. The queue keeps each request separately and
   * matches on every field, so it names which one.
   */
  request: BoringWithdrawRequest;
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
