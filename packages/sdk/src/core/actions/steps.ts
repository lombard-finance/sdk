/**
 * Action progress steps
 *
 * One vocabulary of five keys, replacing the sixteen per-class step shapes.
 *
 * @module core/actions/steps
 */

import type { StepStatus, StrategyProgress } from '../types';

/**
 * The five progress steps every action reports.
 *
 * **This must be a `type`, not an `interface`.** `StrategyProgress.steps` is
 * `Record<string, StepStatus>`. An interface with fixed keys has no index
 * signature and is not assignable to that record; a type alias for an object
 * literal gets one implicitly and is. Converting this declaration to an
 * interface breaks every action class at once, so `_AssertStepsAssignable`
 * below turns that into a compile error here instead.
 *
 * **Every member must stay a bare `StepStatus`** for the same reason. See
 * `SubmitProgress` for why the transaction position lives outside this shape.
 *
 * Actions always emit all five keys, `IDLE` for the inapplicable ones, and
 * expose the ordered applicable subset as `applicableSteps`. Filtering the
 * payload instead would leave `steps.settling` typed `StepStatus` but valued
 * `undefined` with no type error, and since every known reader uses named
 * access, that comparison would be false forever.
 */
export type ActionSteps = {
  /** Signature ceremonies: fee authorization, approval, address confirmation. */
  authorizing: StepStatus;
  /**
   * Waiting on funds the SDK cannot send itself.
   *
   * Bitcoin-source routes sit here after `execute()` returns a deposit address.
   * `IDLE` for every action with no external funding step.
   */
  awaitingFunds: StepStatus;
  /** Broadcasting. See `SubmitProgress` for which transaction, when several. */
  submitting: StepStatus;
  /** Waiting for confirmations on the submitted transaction. */
  confirming: StepStatus;
  /** Waiting for the off-chain leg: notarization, release, or a queue. */
  settling: StepStatus;
};

/**
 * Which transaction of how many is in flight.
 *
 * ## Why this is not inside `ActionSteps`
 *
 * Five fixed keys cannot say *which* transaction is in flight, and several
 * routes send more than one: BTC.b to BTC on Avalanche is three sequential
 * transactions where LBTC to BTC is one. Collapsing those onto a single pending
 * flag loses exactly what a wallet-signing UI needs to render.
 *
 * The obvious home was a wider `submitting` key, typed
 * `StepStatus | { status; index; of }`. That does not work, and the reason is
 * the same constraint that forces `ActionSteps` to be a `type`: the object arm
 * is not a `StepStatus`, so the shape stops being assignable to
 * `StrategyProgress['steps']`, which is `Record<string, StepStatus>`. Widening
 * that record instead would make every existing reader's
 * `steps.foo === 'complete'` a comparison against a possible object.
 *
 * So the position travels beside the steps rather than inside them. A renderer
 * that only cares whether submission is in progress still reads
 * `steps.submitting`; one drawing "2 of 3" reads this.
 */
export interface SubmitProgress {
  /** 1-based position of the transaction in flight. */
  index: number;
  /** How many transactions this route sends in total. */
  of: number;
}

/** The five step keys, ordered as they occur. */
export const ACTION_STEP_KEYS = [
  'authorizing',
  'awaitingFunds',
  'submitting',
  'confirming',
  'settling',
] as const satisfies readonly (keyof ActionSteps)[];

export type ActionStepKey = (typeof ACTION_STEP_KEYS)[number];

// ═══════════════════════════════════════════════════════════════════════════
// Standing assertions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Proves `ActionSteps` is still assignable to `StrategyProgress['steps']`.
 *
 * Two edits make this resolve to `false` and stop the assignment compiling:
 * declaring `ActionSteps` as an interface, or widening any member beyond
 * `StepStatus`. Either failure is one error here rather than a cascade through
 * every action class.
 */
type _IsAssignableToStepsRecord =
  ActionSteps extends StrategyProgress<string>['steps'] ? true : false;

const _AssertStepsAssignable: _IsAssignableToStepsRecord = true;
void _AssertStepsAssignable;

/** Proves every declared key is listed in `ACTION_STEP_KEYS`, and no others. */
type _AssertKeysExhaustive = ActionStepKey extends keyof ActionSteps
  ? keyof ActionSteps extends ActionStepKey
    ? true
    : false
  : false;

const _AssertKeys: _AssertKeysExhaustive = true;
void _AssertKeys;
