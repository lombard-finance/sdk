/**
 * Event definitions for all actions
 *
 * Every action emits the same five events with the same wire values. This module
 * used to declare that set nine times — once per operation — as nine const
 * objects and nine handler-map interfaces with byte-identical members. They are
 * now one `ActionEvent` / `ActionEventMap`. The nine former names were briefly
 * kept as deprecated aliases and are removed in 6.0.0 — a name kept alive is a
 * name that keeps being copied.
 *
 * The collapse is wire-compatible by construction: the string values are
 * unchanged, so `action.on('progress', ...)` behaves exactly as before.
 */

import type { StrategyProgress } from '../core/types';
import type { LombardError } from './errors';

/**
 * Base constraint for event handler maps.
 *
 * Exported because `ActionEventMap` must satisfy it and consumers extending the
 * map need to reference it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event emitter requires bivariant `any` for type-safe event handler signatures
export type StrategyEventHandlerMap = Record<string, (...args: any[]) => void>;

/**
 * The events every action emits.
 *
 * Wire values are frozen. Changing one is a breaking change for every consumer
 * that subscribes by string.
 */
export const ActionEvent = {
  /** Progress update with detailed step information */
  Progress: 'progress',

  /** Status change (e.g., 'idle' → 'ready' → 'completed') */
  StatusChange: 'status-change',

  /** Operation completed successfully */
  Completed: 'completed',

  /** Operation failed */
  Failed: 'failed',

  /** Error occurred */
  Error: 'error',
} as const;

export type ActionEvent = (typeof ActionEvent)[keyof typeof ActionEvent];

/**
 * Handler signatures for {@link ActionEvent}.
 *
 * Must keep `extends StrategyEventHandlerMap`: that index signature is the only
 * reason the map satisfies `BaseAction`'s generic constraint, and dropping it
 * breaks every action class at once.
 */
export interface ActionEventMap extends StrategyEventHandlerMap {
  [ActionEvent.Progress]: (progress: StrategyProgress<string>) => void;
  [ActionEvent.StatusChange]: (status: string) => void;
  [ActionEvent.Completed]: () => void;
  [ActionEvent.Failed]: () => void;
  [ActionEvent.Error]: (error: LombardError) => void;
}

/**
 * Generic event map for any action.
 *
 * Formerly a nine-member union of structurally identical interfaces, which made
 * it equivalent to any one of them. Now the single map.
 */
export type StrategyEventMap = ActionEventMap;

/** Generic event type for any action. Formerly a nine-member union. */
export type StrategyEvent = ActionEvent;
