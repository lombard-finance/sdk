/**
 * EVM Deploy Action Types
 *
 * @module chains/evm/actions/deploy/types
 */

import type {
  AssetId,
  Chain,
  DeployProtocol,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { LombardError } from '../../../../shared/errors';

// Re-export status for convenience
export { EvmOperationStatus as EvmDeployStatus } from '../../../../shared/constants/statusConstants';

/**
 * EVM Deploy parameters
 */
export interface EvmDeployParams {
  /** Asset to deploy */
  asset: AssetId;
  /** Source chain */
  sourceChain: Chain;
  /** Default protocol */
  protocol: DeployProtocol;
  /** Recipient address for vault shares */
  recipient: string;
  /** Slippage tolerance */
  slippage?: number;
}

/**
 * EVM Deploy prepare parameters
 */
export interface EvmDeployPrepareParams {
  /** Amount to deploy */
  amount: string;
  /** Protocol to deploy to */
  protocol: DeployProtocol;
}

/**
 * EVM Deploy progress
 */
export interface EvmDeployProgress
  extends StrategyProgress<EvmOperationStatus> {
  status: EvmOperationStatus;
  steps: {
    approval: StepStatus;
    deploying: StepStatus;
  };
  txHash?: string;
}

/**
 * EVM Deploy interface
 */
export interface IEvmDeploy extends MonitorableAction {
  readonly status: EvmOperationStatus;
  readonly error: LombardError | null;
  readonly amount?: string;
  readonly protocol?: DeployProtocol;
  readonly needsApproval: boolean;
  readonly txHash?: string;

  prepare(params: EvmDeployPrepareParams): Promise<void>;
  approve(): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
