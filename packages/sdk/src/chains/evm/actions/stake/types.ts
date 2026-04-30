/**
 * EVM Stake Action Types
 *
 * Stake BTC.b to receive LBTC via Asset Router.
 *
 * ## Approval (Avalanche only)
 *
 * On Avalanche, users must approve the Adapter contract to spend their BTC.b.
 *
 * ## Fee Authorization (Ethereum/Sepolia only)
 *
 * Fee authorization is required on unsubsidized chains (Ethereum, Sepolia).
 * On subsidized chains (Avalanche, Base, BSC), no fee auth is required.
 *
 * ## Flow Examples
 *
 * **Avalanche (needs approval):**
 * IDLE → NEEDS_APPROVAL → READY → COMPLETED
 *
 * **Ethereum/Sepolia (needs fee auth):**
 * IDLE → NEEDS_FEE_AUTHORIZATION → READY → COMPLETED
 *
 * **Base/BSC (neither):**
 * IDLE → READY → COMPLETED
 *
 * @module chains/evm/actions/stake/types
 */

import type {
    AssetId,
    Chain,
    StepStatus,
    StrategyProgress } from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { LombardError } from '../../../../shared/errors';
import type { FeeAuthState } from '../../shared/feeAuth';

// Re-export status for convenience
export { EvmOperationStatus as EvmStakeStatus } from '../../../../shared/constants/statusConstants';

/**
 * EVM Stake parameters
 *
 * Stakes BTC.b to receive LBTC.
 */
export interface EvmStakeParams {
  /** Input asset (BTC.b) */
  assetIn: AssetId;
  /** Output asset (LBTC) */
  assetOut: AssetId;
  /** Source chain (where BTC.b is held) */
  sourceChain: Chain;
  /** Destination chain (same as source) */
  destChain: Chain;
}

/**
 * EVM Stake prepare parameters
 */
export interface EvmStakePrepareParams {
  /** Amount of BTC.b to stake */
  amount: string;
}

/**
 * EVM Stake progress
 */
export interface EvmStakeProgress extends StrategyProgress<EvmOperationStatus> {
  status: EvmOperationStatus;
  steps: {
    approval?: StepStatus;
    staking: StepStatus;
  };
  txHash?: string;
}

/**
 * EVM Stake interface
 */
export interface IEvmStake extends MonitorableAction {
  readonly status: EvmOperationStatus;
  readonly error: LombardError | null;
  readonly amount?: string;
  readonly txHash?: string;
  /** Fee authorization state (for UI display) */
  readonly feeAuth: FeeAuthState;
  /** Whether approval is needed (Avalanche only) */
  readonly needsApproval: boolean;

  prepare(params: EvmStakePrepareParams): Promise<void>;
  /**
   * Approve BTC.b spending (Avalanche only)
   * Only needed when status is NEEDS_APPROVAL.
   */
  approve(): Promise<void>;
  /**
   * Authorize fee (EIP-712 signing)
   * Only needed on unsubsidized chains (Ethereum/Sepolia).
   */
  authorizeFee(): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
