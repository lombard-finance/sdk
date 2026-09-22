/**
 * BTC Deposit Action Types
 *
 * Type definitions for BTC deposit operations.
 *
 * @module chains/btc/actions/deposit-btcb/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
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
 * The LBTC route is the same verb with `assetOut: AssetId.LBTC`.
 */
export interface BtcDepositBtcbParams {
  /** Output asset (BTC.b). A literal, so `deposit()` can dispatch on it. */
  assetOut: typeof AssetId.BTCb;
  /** Destination chain for minted asset */
  destChain: Chain;
  /** Source Bitcoin network (optional, defaults based on env) */
  sourceChain?: typeof Chain.BITCOIN_MAINNET | typeof Chain.BITCOIN_SIGNET;
}

/**
 * Prepare parameters
 */
export interface BtcDepositBtcbPrepareParams {
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
export interface BtcDepositBtcbProgress extends StrategyProgress<BtcActionStatus> {
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
export interface BtcDepositBtcb extends MonitorableAction {
  readonly status: BtcActionStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly depositAddress?: string;
  readonly referralCode?: string;

  /**
   * Prepare the deposit operation
   */
  prepare(params: BtcDepositBtcbPrepareParams): Promise<void>;

  /**
   * Authorize the network fee (Ethereum mainnet only)
   * For other chains, use confirmAddress() instead.
   */
  /**
   * Run whichever authorization ceremony this route needs.
   *
   * Replaces the authorizeFee/confirmAddress pair, which split one
   * ceremony into two methods each guarding against the wrong route.
   */
  authorize(): Promise<void>;
  /** @deprecated Use {@link authorize}. */
  authorizeFee(): Promise<void>;

  /**
   * Confirm destination address (non-Ethereum chains)
   * For Ethereum mainnet, use authorizeFee() instead.
   */
  /** @deprecated Use {@link authorize}. */
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
