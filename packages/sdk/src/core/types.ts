/**
 * Core Types
 *
 * Common types used across the Lombard SDK.
 *
 * @module core/types
 */

import type { AssetId } from './assets';
import type { Chain } from './chains';

// ═══════════════════════════════════════════════════════════════════════════
// Strategy Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common strategy statuses across all operation types
 */
export const StrategyStatus = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  READY: 'ready',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed' } as const;

export type StrategyStatus =
  (typeof StrategyStatus)[keyof typeof StrategyStatus];

/**
 * Step status for progress tracking
 */
export const StepStatus = {
  IDLE: 'idle',
  PENDING: 'pending',
  COMPLETE: 'complete',
  FAILED: 'failed' } as const;

export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

/**
 * Progress information for strategy execution
 */
export interface StrategyProgress<TStatus extends string> {
  /** Current strategy status */
  status: TStatus;

  /** Individual step statuses (keys vary by strategy) */
  steps: Record<string, StepStatus>;

  /** Optional: Current confirmations for blockchain transactions */
  confirmations?: number;

  /** Optional: Required confirmations for completion */
  requiredConfirmations?: number;

  /** Optional: Transaction hash or signature after submission (e.g. EVM tx hash, Solana signature) */
  txHash?: string;

  /** Optional: Additional metadata specific to the strategy */
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Route Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Route parameters for registry lookups
 */
export interface RouteParams {
  /** Input asset (optional for some operations like deposits) */
  assetIn?: AssetId;

  /** Output asset */
  assetOut: AssetId;

  /** Source blockchain (optional for some operations) */
  sourceChain?: Chain;

  /** Destination blockchain */
  destChain: Chain;
}

// ═══════════════════════════════════════════════════════════════════════════
// Deploy Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deploy protocol identifiers
 *
 * Re-exported from defi-registry.ts which is the single source of truth.
 * Use DefiProtocol.Veda ('veda') or DefiProtocol.Silo ('silo').
 */
export {
  type DefiProtocol,
  DefiProtocol as DeployProtocol } from '../defi/defi-registry';

/**
 * Deploy configuration for stake-and-deploy operations
 */
export interface DeployConfig {
  /** Target protocol (use DeployProtocol.Veda or DeployProtocol.Silo) */
  protocol: string;

  /** Optional: Amount to deploy (partial deployment) */
  amount?: bigint;

  /** Optional: Slippage tolerance in basis points (e.g., 50 = 0.5%) */
  slippage?: number;

  /** Optional: Deadline timestamp for the deployment transaction */
  deadline?: number;

  /** Optional: Protocol-specific options */
  options?: Record<string, unknown>;
}

