/**
 * EVM Unstake Action Types
 *
 * ## Fee Authorization
 *
 * Fee authorization is required when:
 * - Output asset is BTC.b (LBTC → BTC.b conversion)
 * - Source chain is Ethereum/Sepolia (unsubsidized chains)
 *
 * **Flow with fee auth (LBTC → BTC.b on Ethereum/Sepolia):**
 * IDLE → NEEDS_FEE_AUTHORIZATION → READY → COMPLETED
 *
 * **Flow without fee auth (LBTC → BTC, or BTC.b on Base/BSC):**
 * IDLE → READY → COMPLETED
 *
 * @module chains/evm/actions/unstake/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { LombardError } from '../../../../shared/errors';
import type { FeeAuthState } from '../../shared/feeAuth';

// Re-export status for convenience
export { EvmOperationStatus as EvmUnstakeStatus } from '../../../../shared/constants/statusConstants';

/**
 * EVM Unstake parameters
 */
export interface EvmUnstakeParams {
  /** Input asset (LBTC) */
  assetIn: AssetId;
  /** Output asset (BTC for cross-chain, BTCb for same-chain) */
  assetOut: AssetId;
  /** Source chain (where LBTC is burned) */
  sourceChain: Chain;
  /** Destination chain (Bitcoin or same EVM chain) */
  destChain: Chain;
}

/**
 * EVM Unstake prepare parameters
 */
export interface EvmUnstakePrepareParams {
  /** Amount to unstake (in LBTC) */
  amount: string;
  /** Recipient address (BTC address or EVM address) */
  recipient: string;
}

/**
 * EVM Unstake progress
 */
export interface EvmUnstakeProgress extends StrategyProgress<EvmOperationStatus> {
  status: EvmOperationStatus;
  steps: {
    burning: StepStatus;
    releasing: StepStatus;
  };
  txHash?: string;
}

/**
 * EVM Unstake interface
 */
export interface IEvmUnstake extends MonitorableAction {
  readonly status: EvmOperationStatus;
  readonly error: LombardError | null;
  readonly amount?: string;
  readonly recipient?: string;
  readonly txHash?: string;

  /** Fee authorization state (for UI display) */
  readonly feeAuth: FeeAuthState;

  prepare(params: EvmUnstakePrepareParams): Promise<void>;
  /** Authorize the network fee (when status is NEEDS_FEE_AUTHORIZATION) */
  authorizeFee(): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
