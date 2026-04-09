/**
 * EVM Redeem Action Types
 *
 * Redeems BTC.b to native BTC (cross-chain).
 * This is the opposite operation to BTC Deposit.
 *
 * Flow: BTC.b (EVM) → BTC (Bitcoin)
 *
 * ## Fee Authorization
 *
 * On Ethereum/Sepolia, fee authorization is required before redemption.
 *
 * **Flow with fee auth (Ethereum/Sepolia):**
 * IDLE → NEEDS_FEE_AUTHORIZATION → READY → COMPLETED
 *
 * **Flow without fee auth (Base, BSC - subsidized):**
 * IDLE → READY → COMPLETED
 *
 * @module chains/evm/actions/redeem/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from "../../../../core";
import type { MonitorableAction } from "../../../../shared/actions/BaseAction";
import type { EvmOperationStatus } from "../../../../shared/constants/statusConstants";
import type { LombardError } from "../../../../shared/errors";
import type { FeeAuthState } from "../../shared/feeAuth";

// Re-export status for convenience
export { EvmOperationStatus as EvmRedeemStatus } from "../../../../shared/constants/statusConstants";

/**
 * EVM Redeem parameters
 *
 * Redeems BTC.b to native BTC on Bitcoin network.
 */
export interface EvmRedeemParams {
  /** Input asset (BTC.b) */
  assetIn: AssetId;
  /** Output asset (BTC) */
  assetOut: AssetId;
  /** Source chain (EVM chain where BTC.b is held) */
  sourceChain: Chain;
  /** Destination chain (Bitcoin network) */
  destChain: Chain;
}

/**
 * EVM Redeem prepare parameters
 */
export interface EvmRedeemPrepareParams {
  /** Amount of BTC.b to redeem */
  amount: string;
  /** Bitcoin address to receive BTC */
  recipient: string;
}

/**
 * EVM Redeem progress
 */
export interface EvmRedeemProgress extends StrategyProgress<EvmOperationStatus> {
  status: EvmOperationStatus;
  steps: {
    redeeming: StepStatus;
  };
  txHash?: string;
}

/**
 * EVM Redeem interface
 */
export interface IEvmRedeem extends MonitorableAction {
  readonly status: EvmOperationStatus;
  readonly error: LombardError | null;
  readonly amount?: string;
  readonly recipient?: string;
  readonly needsApproval: boolean;
  readonly txHash?: string;

  /** Fee authorization state (for UI display) */
  readonly feeAuth: FeeAuthState;

  prepare(params: EvmRedeemPrepareParams): Promise<void>;
  /** Authorize the network fee (when status is NEEDS_FEE_AUTHORIZATION) */
  authorizeFee(): Promise<void>;
  approve(): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
