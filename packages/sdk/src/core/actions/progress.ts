/**
 * Action progress
 *
 * One payload shape, replacing sixteen. A seventeenth vocabulary was an ordered
 * name array (`previewWithdrawEarn`) and an eighteenth was `MonitorProgress`,
 * hardcoded to three keys and not exported despite being the return type of the
 * live monitoring path.
 *
 * @module core/actions/progress
 */

import type { RouteLabel } from './route';
import type { ActionStatus } from './status';
import type { ActionSteps, SubmitProgress } from './steps';

/** Transaction hashes by leg, so a multi-transaction route can report each. */
export interface ActionTxHashes {
  approval?: string;
  execution?: string;
  release?: string;
}

/**
 * What every action emits on `progress`.
 *
 * It deliberately does **not** extend `StrategyProgress`, which would silently
 * inherit `txHash?: string` alongside the new `txHashes` — the exact class of
 * silent drop this shape exists to prevent. It stays structurally assignable,
 * which is all the event handlers need.
 */
export interface ActionProgress {
  status: ActionStatus;
  steps: ActionSteps;

  /**
   * Which transaction of how many, on routes that send more than one. Absent on
   * single-transaction routes, which is most of them.
   */
  submission?: SubmitProgress;

  confirmations?: number;
  requiredConfirmations?: number;
  hasEnoughConfirmations?: boolean;

  isClaimed?: boolean;

  /** Bitcoin-source routes only. */
  depositAddress?: string;

  txHashes?: ActionTxHashes;

  /** Which journey this is, now that one class can cover several. */
  route?: RouteLabel;

  metadata?: Record<string, unknown>;
}
