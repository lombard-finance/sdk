/**
 * BTC Deposit Action Types
 *
 * Type definitions for BTC deposit operations.
 *
 * @module chains/btc/actions/deposit/types
 */

import type {
  AssetId,
  Chain,
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
 * BTC Deposit parameters
 *
 * Note: BTC Deposit is for custody operations (BTC → BTC.b).
 * For staking operations (BTC → LBTC), use BtcStake instead.
 */
export interface BtcDepositParams {
  /** Output asset - should be BTCb for deposit, LBTC for stake */
  assetOut: AssetId;
  /** Destination chain for minted asset */
  destChain: Chain;
  /** Source Bitcoin network (optional, defaults based on env) */
  sourceChain?: typeof Chain.BITCOIN_MAINNET | typeof Chain.BITCOIN_SIGNET;
}

/**
 * Prepare parameters
 */
export interface BtcDepositPrepareParams {
  /** Amount of BTC to deposit (human-readable, e.g., "0.1") */
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
 * BTC Deposit progress
 */
export interface BtcDepositProgress extends StrategyProgress<BtcActionStatus> {
  status: BtcActionStatus;
  steps: {
    created: StepStatus;
    verifying: StepStatus;
    issuing: StepStatus;
  };
  confirmations?: number;
  requiredConfirmations?: number;
  hasEnoughConfirmations?: boolean;
  isClaimed?: boolean;
  depositAddress?: string;
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Interface
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC Deposit interface
 */
export interface BtcDeposit extends MonitorableAction {
  readonly status: BtcActionStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly depositAddress?: string;
  readonly referralCode?: string;

  /**
   * Prepare the deposit operation
   */
  prepare(params: BtcDepositPrepareParams): Promise<void>;

  /**
   * Authorize the network fee (Ethereum mainnet only)
   * For other chains, use confirmAddress() instead.
   */
  authorizeFee(): Promise<void>;

  /**
   * Confirm destination address (non-Ethereum chains)
   * For Ethereum mainnet, use authorizeFee() instead.
   */
  confirmAddress(): Promise<void>;

  /**
   * Generate BTC deposit address
   */
  generateDepositAddress(captchaToken?: string): Promise<string>;

  /**
   * Execute the deposit
   */
  execute(): Promise<{ depositAddress: string; txHash?: string }>;

  /**
   * Monitor deposit progress
   */
  monitorDeposit?(): Promise<MonitorProgress | undefined>;
}
