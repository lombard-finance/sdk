/**
 * EVM Deposit Action Types
 *
 * @module chains/evm/actions/claim/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { LombardError } from '../../../../shared/errors';

/**
 * EVM Deposit status
 *
 * Note: There is NO 'failed' status. Error handling is separate from status:
 * - `status` = "What step are you at?" (flow position)
 * - `error` = "Did something go wrong?" (Error | null)
 * - `isFailed` = Derived from `error !== null`
 *
 * Use `isLoading` for operation-in-progress state (no transitional statuses).
 */
export enum EvmClaimStatus {
  IDLE = 'idle',
  NEEDS_APPROVAL = 'needs-approval',
  READY = 'ready',
  BRIDGING = 'bridging',
  COMPLETED = 'completed',
}

/**
 * EVM Deposit parameters
 */
export interface EvmClaimParams {
  /** Input asset (BTCb) */
  assetIn: AssetId;
  /** Output asset (LBTC) */
  assetOut: AssetId;
  /** Source chain */
  sourceChain: Chain;
  /** Destination chain */
  destChain: Chain;
}

/**
 * EVM Deposit prepare parameters
 */
export interface EvmClaimPrepareParams {
  /** Amount to deposit */
  amount: string;
  /** Recipient address */
  recipient: string;
}

/**
 * EVM Deposit progress
 */
export interface EvmClaimProgress extends StrategyProgress<EvmClaimStatus> {
  status: EvmClaimStatus;
  steps: {
    approval: StepStatus;
    execution: StepStatus;
    bridging?: StepStatus;
  };
  txHash?: string;
}

/**
 * EVM Deposit interface
 */
export interface IEvmClaim extends MonitorableAction {
  readonly status: EvmClaimStatus;
  readonly error: LombardError | null;
  readonly amount?: string;
  readonly recipient?: string;
  readonly needsApproval: boolean;
  readonly txHash?: string;

  /** Set claim data from a notarized deposit (required before execute) */
  setClaimData(data: string, proofSignature: string): void;
  prepare(params: EvmClaimPrepareParams): Promise<void>;
  approve(): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
