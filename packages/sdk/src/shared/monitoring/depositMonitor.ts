/**
 * Deposit Monitor Utility
 *
 * Shared monitoring logic for tracking Bitcoin deposit confirmations
 * and minting status. Used by BtcDepositLbtc, BtcDepositBtcb, and BtcDeployLbtc actions.
 *
 * @module shared/monitoring/depositMonitor
 */

import { StepStatus } from '../../core';
import type { BtcService } from '../../modules/btcModule';

/** Bitcoin network mode */
export type NetworkMode = 'mainnet' | 'testnet';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deposit information returned by fetch function
 */
export interface DepositInfo {
  /** Block height where deposit was confirmed */
  blockHeight?: number;
  /** Whether LBTC has been minted/claimed */
  isClaimed?: boolean;
}

/**
 * Progress information emitted during monitoring
 */
export interface MonitorProgress {
  /** Current confirmations */
  confirmations: number;
  /** Required confirmations for finality */
  requiredConfirmations: number;
  /** Whether deposit has enough confirmations */
  hasEnoughConfirmations: boolean;
  /** Whether LBTC has been claimed */
  isClaimed: boolean;
  /** Step statuses for UI */
  steps: {
    created: StepStatus;
    verifying: StepStatus;
    issuing: StepStatus;
  };
}

/**
 * Options for deposit monitoring
 */
export interface MonitorOptions {
  /** Function to fetch deposit information */
  fetchDeposit: () => Promise<DepositInfo | undefined>;
  /** Bitcoin network mode */
  network: NetworkMode;
  /** BTC service for block height queries */
  btcService: BtcService;
  /** Number of confirmations required (default: 6) */
  requiredConfirmations?: number;
  /** Callback for progress updates */
  onProgress?: (progress: MonitorProgress) => void;
  /** Callback when deposit is fully claimed */
  onComplete?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Monitor Function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Monitor a Bitcoin deposit for confirmations and minting
 *
 * This is a single-shot check. For continuous monitoring, call this
 * function repeatedly with a timer/interval.
 *
 * @param options - Monitoring options
 * @returns Progress information or undefined if deposit not found
 *
 * @example
 * ```typescript
 * const progress = await monitorDeposit({
 *   fetchDeposit: async () => {
 *     const deposits = await getDepositsByAddress({ address, env });
 *     return deposits.find(d => d.depositAddress === myAddress);
 *   },
 *   network: 'mainnet',
 *   btcService: ctx.btc,
 *   onProgress: (p) => console.log(`${p.confirmations}/${p.requiredConfirmations}`),
 *   onComplete: () => console.log('Deposit complete!'),
 * });
 * ```
 */
export async function monitorDeposit(
  options: MonitorOptions,
): Promise<MonitorProgress | undefined> {
  const {
    fetchDeposit,
    network,
    btcService,
    requiredConfirmations = 6,
    onProgress,
    onComplete,
  } = options;

  // Fetch current deposit status
  const deposit = await fetchDeposit();
  if (!deposit) {
    return undefined;
  }

  const blockHeight = deposit.blockHeight;
  if (typeof blockHeight !== 'number') {
    return undefined;
  }

  // Get current block height and calculate confirmations
  const currentBlockHeight = await btcService.getCurrentBlockHeight(network);
  const confirmations = Math.max(0, currentBlockHeight - blockHeight);
  const hasEnoughConfirmations = confirmations >= requiredConfirmations;
  const isClaimed = deposit.isClaimed ?? false;

  // Build progress object
  const progress: MonitorProgress = {
    confirmations,
    requiredConfirmations,
    hasEnoughConfirmations,
    isClaimed,
    steps: {
      created: StepStatus.COMPLETE,
      verifying: hasEnoughConfirmations
        ? StepStatus.COMPLETE
        : StepStatus.PENDING,
      issuing: isClaimed ? StepStatus.COMPLETE : StepStatus.PENDING,
    },
  };

  // Emit callbacks
  onProgress?.(progress);
  if (isClaimed) {
    onComplete?.();
  }

  return progress;
}

/**
 * Create a polling monitor that checks deposit status at intervals
 *
 * @param options - Monitoring options
 * @param intervalMs - Polling interval in milliseconds (default: 30000)
 * @returns Stop function to cancel monitoring
 *
 * @example
 * ```typescript
 * const stop = createPollingMonitor({
 *   fetchDeposit,
 *   network: 'mainnet',
 *   btcService: ctx.btc,
 *   onProgress: updateUI,
 *   onComplete: () => {
 *     stop(); // Stop polling when complete
 *     showSuccess();
 *   },
 * }, 30000);
 *
 * // Later: stop monitoring
 * stop();
 * ```
 */
export function createPollingMonitor(
  options: MonitorOptions,
  intervalMs = 30000,
): () => void {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const poll = async () => {
    if (stopped) return;

    try {
      const progress = await monitorDeposit(options);

      // Stop polling if claimed
      if (progress?.isClaimed) {
        stopped = true;
        return;
      }
    } catch (error) {
      // Continue polling on error
      console.warn('Deposit monitor poll failed:', error);
    }

    // Schedule next poll
    if (!stopped) {
      timeoutId = setTimeout(poll, intervalMs);
    }
  };

  // Start polling
  poll();

  // Return stop function
  return () => {
    stopped = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}
