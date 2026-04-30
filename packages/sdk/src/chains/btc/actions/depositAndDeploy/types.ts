/**
 * BTC DepositAndDeploy Action Types
 *
 * Type definitions for BTC → BTC.b → Vault operations.
 * This is the deposit equivalent of StakeAndDeploy, producing BTC.b
 * instead of LBTC for protocols that require wrapped BTC (e.g., Silo on Avalanche).
 *
 * @module chains/btc/actions/depositAndDeploy/types
 */

import type {
  AssetId,
  Chain,
  DeployProtocol,
  StepStatus,
  StrategyProgress } from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import { BtcActionStatus } from '../../../../shared/constants/statusConstants';
import type { MonitorProgress } from '../../../../shared/monitoring';

// Re-export for convenience (single export statement avoids duplicate identifier)
export { BtcActionStatus };

// ═══════════════════════════════════════════════════════════════════════════
// Parameters
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC DepositAndDeploy parameters
 */
export interface BtcDepositAndDeployParams {
  /** Input asset (BTC) */
  assetIn?: AssetId;
  /** Output asset (BTC.b vault shares) */
  assetOut: AssetId;
  /** Source Bitcoin network */
  sourceChain?: typeof Chain.BITCOIN_MAINNET | typeof Chain.BITCOIN_SIGNET;
  /** Destination chain where vault exists (e.g., Avalanche for Silo) */
  destChain: Chain;
  /** Protocol/vault to deploy to (e.g., Silo) */
  protocol: DeployProtocol;
}

/**
 * Prepare parameters
 */
export interface BtcDepositAndDeployPrepareParams {
  /** Amount of BTC to deposit and deploy (human-readable) */
  amount: string;
  /** Recipient address on destination chain */
  recipient: string;
  /** Optional referral code */
  referralCode?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Progress
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC DepositAndDeploy progress
 */
export interface BtcDepositAndDeployProgress
  extends StrategyProgress<BtcActionStatus> {
  status: BtcActionStatus;
  steps: {
    created: StepStatus;
    verifying: StepStatus;
    wrapping: StepStatus;
    depositing: StepStatus;
  };
  depositAddress?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  hasEnoughConfirmations?: boolean;
  isWrapped?: boolean;
  isDeposited?: boolean;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Interface
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC DepositAndDeploy interface
 */
export interface BtcDepositAndDeploy extends MonitorableAction {
  readonly status: BtcActionStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly depositAddress?: string;
  readonly referralCode?: string;

  /**
   * Prepare the operation
   */
  prepare(params: BtcDepositAndDeployPrepareParams): Promise<void>;

  /**
   * Authorize vault deposit via signature
   */
  authorizeDeposit(): Promise<void>;

  /**
   * Generate BTC deposit address
   */
  generateDepositAddress(captchaToken?: string): Promise<string>;

  /**
   * Execute the operation
   */
  execute(): Promise<{ depositAddress: string; txHash?: string }>;

  /**
   * Monitor deposit progress
   */
  monitorDeposit?(): Promise<MonitorProgress | undefined>;
}
