/**
 * BTC Stake Action Types
 *
 * Defines types for the BTC → LBTC staking flow.
 *
 * @module chains/btc/actions/stake/types
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

/**
 * BTC Stake parameters
 *
 * Parameters for initiating a BTC stake operation.
 */
export interface BtcStakeParams {
  /** Output asset (LBTC) */
  assetOut: AssetId;
  /** Destination chain to mint LBTC on */
  destChain: Chain;
  /** Source Bitcoin network (optional, defaults based on env) */
  sourceChain?: typeof Chain.BITCOIN_MAINNET | typeof Chain.BITCOIN_SIGNET;
}

/**
 * BTC Stake progress
 *
 * Detailed progress information for a BTC stake operation.
 */
export interface BtcStakeProgress extends StrategyProgress<BtcActionStatus> {
  /** Current status */
  status: BtcActionStatus;

  /** Step statuses */
  steps: {
    created: StepStatus;
    verifying: StepStatus;
    issuing: StepStatus;
  };

  /** Optional: Current confirmations */
  confirmations?: number;

  /** Optional: Required confirmations */
  requiredConfirmations?: number;

  /** Optional: Has enough confirmations */
  hasEnoughConfirmations?: boolean;

  /** Optional: Is minting claimed */
  isClaimed?: boolean;

  /** Optional: BTC deposit address */
  depositAddress?: string;

  /** Optional: Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * BTC Stake interface
 *
 * Interface for BTC → LBTC staking operations.
 *
 * Flow:
 * 1. prepare(amount, recipient) - Validate and store parameters
 * 2. authorize() - Performs any required authorization (fee or address confirmation)
 * 3. generateDepositAddress() - Generate BTC deposit address
 * 4. execute() - Returns address for user to send BTC
 * 5. Monitor progress via events
 *
 * @example
 * ```typescript
 * const stake = sdk.chain.btc.stake({
 *   assetOut: AssetId.LBTC,
 *   destChain: Chain.ETHEREUM,
 * });
 *
 * await stake.prepare({ amount: '0.1', recipient: '0x...' });
 * await stake.authorize();
 * const address = await stake.generateDepositAddress();
 *
 * // User sends BTC to address
 * // Monitor progress
 * stake.on('progress', (progress) => {
 *   console.log(progress.confirmations, progress.requiredConfirmations);
 * });
 * ```
 */
export interface BtcStake extends MonitorableAction {
  /** Current status */
  readonly status: BtcActionStatus;

  /** Amount to stake (human-readable BTC) */
  readonly amount?: string;

  /** Recipient address on destination chain */
  readonly recipient?: string;

  /** BTC deposit address (after generation) */
  readonly depositAddress?: string;

  /** Referral code applied during prepare(), if any */
  readonly referralCode?: string;

  /**
   * Prepare the stake operation
   *
   * Validates amount and recipient, checks for existing fee authorization.
   *
   * @param params - Object containing amount and recipient
   * @param params.amount - Amount to stake (human-readable BTC, e.g., "0.1")
   * @param params.recipient - Recipient address on destination chain
   * @param params.referralCode - Optional referral code
   * @throws LombardError if parameters are invalid
   */
  prepare(params: {
    amount: string;
    recipient: string;
    referralCode?: string;
  }): Promise<void>;

  /**
   * Authorize the stake operation
   *
   * Handles any required authorization step depending on destination chain.
   * For Ethereum destinations this requests an EIP-712 fee signature; for
   * other EVM chains it confirms the destination address signature.
   *
   * @throws LombardError if the user rejects or provider fails
   */
  authorize(): Promise<void>;

  /**
   * Generate BTC deposit address
   *
   * Creates a unique BTC deposit address for this stake operation.
   * Requires authorization to be completed first.
   *
   * @returns BTC deposit address (bc1...)
   * @throws LombardError if not authorized or API fails
   */
  generateDepositAddress(captchaToken?: string): Promise<string>;

  /**
   * Execute the stake operation
   *
   * Returns the deposit address. User should send BTC to this address.
   * Progress can be monitored via events.
   *
   * @returns Object with depositAddress and optional txHash
   */
  execute(): Promise<{ depositAddress: string; txHash?: string }>;

  /**
   * Monitor deposit progress
   *
   * Single-shot check for deposit status. Call repeatedly for continuous monitoring.
   * Emits progress events and completion when deposit is fully claimed.
   *
   * @returns Progress information or undefined if deposit not found yet
   */
  monitorDeposit?(): Promise<MonitorProgress | undefined>;
}
