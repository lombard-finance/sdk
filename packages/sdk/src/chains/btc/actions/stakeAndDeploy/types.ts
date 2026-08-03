/**
 * BTC StakeAndDeploy Action Types
 *
 * Type definitions for BTC → LBTC → Vault operations.
 *
 * @module chains/btc/actions/stakeAndDeploy/types
 */

import type {
  AssetId,
  Chain,
  DeployProtocol,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import { BtcActionStatus } from '../../../../shared/constants/statusConstants';
import type { MonitorProgress } from '../../../../shared/monitoring';
import type { AuthorizeDepositOptions } from '../shared';

// Re-export for convenience (single export statement avoids duplicate identifier)
export { BtcActionStatus };
export type { AuthorizeDepositOptions };

// ═══════════════════════════════════════════════════════════════════════════
// Parameters
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC StakeAndDeploy parameters
 */
export interface BtcStakeAndDeployParams {
  /** Input asset (BTC) */
  assetIn?: AssetId;
  /** Output asset (LBTC vault shares) */
  assetOut: AssetId;
  /** Source Bitcoin network */
  sourceChain?: typeof Chain.BITCOIN_MAINNET | typeof Chain.BITCOIN_SIGNET;
  /** Destination chain where vault exists */
  destChain: Chain;
  /** Protocol/vault to deploy to */
  protocol: DeployProtocol;
}

/**
 * Prepare parameters
 */
export interface BtcStakeAndDeployPrepareParams {
  /** Amount of BTC to stake and deploy (human-readable) */
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
 * BTC StakeAndDeploy progress
 */
export interface BtcStakeAndDeployProgress extends StrategyProgress<BtcActionStatus> {
  status: BtcActionStatus;
  steps: {
    created: StepStatus;
    verifying: StepStatus;
    issuing: StepStatus;
    depositing: StepStatus;
  };
  depositAddress?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  hasEnoughConfirmations?: boolean;
  isClaimed?: boolean;
  isDeposited?: boolean;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Interface
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC StakeAndDeploy interface
 */
export interface BtcStakeAndDeploy extends MonitorableAction {
  readonly status: BtcActionStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly depositAddress?: string;
  readonly referralCode?: string;

  /**
   * Prepare the operation
   */
  prepare(params: BtcStakeAndDeployPrepareParams): Promise<void>;

  /**
   * Authorize vault deposit via signature
   *
   * @param options - Optional signing overrides. `expiry` sets the signature
   * expiration as an absolute UNIX timestamp in seconds (defaults to 24h).
   */
  authorizeDeposit(options?: AuthorizeDepositOptions): Promise<void>;

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
