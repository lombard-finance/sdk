/**
 * EVM Deposit Action Types
 *
 * @module chains/evm/actions/deposit/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from "../../../../core";
import type { MonitorableAction } from "../../../../shared/actions/BaseAction";
import type { LombardError } from "../../../../shared/errors";

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
export enum EvmDepositStatus {
  IDLE = "idle",
  NEEDS_APPROVAL = "needs-approval",
  READY = "ready",
  BRIDGING = "bridging",
  COMPLETED = "completed",
}

/**
 * EVM Deposit parameters
 */
export interface EvmDepositParams {
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
export interface EvmDepositPrepareParams {
  /** Amount to deposit */
  amount: string;
  /** Recipient address */
  recipient: string;
}

/**
 * EVM Deposit progress
 */
export interface EvmDepositProgress extends StrategyProgress<EvmDepositStatus> {
  status: EvmDepositStatus;
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
export interface IEvmDeposit extends MonitorableAction {
  readonly status: EvmDepositStatus;
  readonly error: LombardError | null;
  readonly amount?: string;
  readonly recipient?: string;
  readonly needsApproval: boolean;
  readonly txHash?: string;

  /** Set claim data from a notarized deposit (required before execute) */
  setClaimData(data: string, proofSignature: string): void;
  prepare(params: EvmDepositPrepareParams): Promise<void>;
  approve(): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
