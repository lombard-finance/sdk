/**
 * The one `authorize()`
 *
 * Four spellings existed across the action classes — `approve()`,
 * `authorizeFee()`, `confirmAddress()` and `authorizeDeposit()` — and each threw
 * when called at the wrong point. Which one applies is a property of the route
 * and the chain, so deriving it was work every integrator had to redo.
 *
 * `BaseAction.authorize()` dispatches on status through a per-class handler map.
 * Keying on status rather than a separate flag is what makes it idempotent: the
 * status already records which groups are outstanding, so once a ceremony
 * completes the entry stops matching and there is no second piece of state to
 * keep in step.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseAction } from '../../../shared/actions/BaseAction';
import { LombardError } from '../../../shared/errors';

type TestStatus = 'idle' | 'needs_approval' | 'needs_fee' | 'ready';

/** A minimal action, so the dispatch is tested rather than a chain's plumbing. */
class TestAction extends BaseAction<Record<string, never>, TestStatus> {
  readonly approve = vi.fn(async () => {
    this.updateStatus('ready');
  });
  readonly authorizeFee = vi.fn(async () => {
    this.updateStatus('ready');
  });

  constructor(
    initial: TestStatus,
    private readonly handlers: Array<'approve' | 'fee'> = ['approve', 'fee'],
  ) {
    super(initial);
  }

  protected override authorizationHandlers(): Partial<
    Record<TestStatus, () => Promise<void>>
  > {
    const map: Partial<Record<TestStatus, () => Promise<void>>> = {};
    if (this.handlers.includes('approve'))
      map.needs_approval = () => this.approve();
    if (this.handlers.includes('fee'))
      map.needs_fee = () => this.authorizeFee();
    return map;
  }

  /** Exposed so the test can move the action without a real flow. */
  moveTo(status: TestStatus): void {
    this.updateStatus(status);
  }
}

describe('authorize() dispatch', () => {
  let action: TestAction;

  beforeEach(() => {
    action = new TestAction('needs_approval');
  });

  it('runs the approval ceremony when that is what is outstanding', async () => {
    await action.authorize();

    expect(action.approve).toHaveBeenCalledTimes(1);
    expect(action.authorizeFee).not.toHaveBeenCalled();
  });

  it('runs the fee ceremony when that is what is outstanding', async () => {
    action.moveTo('needs_fee');

    await action.authorize();

    expect(action.authorizeFee).toHaveBeenCalledTimes(1);
    expect(action.approve).not.toHaveBeenCalled();
  });

  it('is a no-op once nothing is outstanding', async () => {
    action.moveTo('ready');

    await action.authorize();

    expect(action.approve).not.toHaveBeenCalled();
    expect(action.authorizeFee).not.toHaveBeenCalled();
  });

  // The property that makes a double-click safe: the status moves as the first
  // call completes, so the second finds no matching entry.
  it('costs one signature however many times it is called', async () => {
    await action.authorize();
    await action.authorize();
    await action.authorize();

    expect(action.approve).toHaveBeenCalledTimes(1);
  });

  it('throws when called before prepare, if the route has ceremonies', async () => {
    const unprepared = new TestAction('idle');

    await expect(unprepared.authorize()).rejects.toThrow(LombardError);
    await expect(unprepared.authorize()).rejects.toThrow(
      /Cannot authorize while status is idle/,
    );
  });

  it('names the statuses it would accept, so the error is actionable', async () => {
    const unprepared = new TestAction('idle');

    await expect(unprepared.authorize()).rejects.toThrow(/needs_approval/);
  });

  it('dispatches only the ceremonies the route declares', async () => {
    // A route with no fee step must not acquire one from the base class.
    const approvalOnly = new TestAction('needs_fee', ['approve']);

    await approvalOnly.authorize();

    expect(approvalOnly.authorizeFee).not.toHaveBeenCalled();
    expect(approvalOnly.approve).not.toHaveBeenCalled();
  });
});

describe('a route with no ceremonies at all', () => {
  /** Solana, Sui and Starknet: the only transaction is the one execute() sends. */
  class NoCeremonyAction extends BaseAction<Record<string, never>, TestStatus> {
    constructor() {
      super('idle');
    }
  }

  it('accepts authorize() as a no-op rather than throwing', async () => {
    // Asymmetric with the case above, deliberately: there is nothing to be too
    // early for. A consumer writing one flow across chains can call authorize()
    // unconditionally instead of branching on which chain it is.
    await expect(new NoCeremonyAction().authorize()).resolves.toBeUndefined();
  });

  it('declares no handlers', () => {
    const action = new NoCeremonyAction();

    // Reaching through the protected member on purpose: the empty default is
    // the contract for these chains, and it should fail loudly if it changes.
    const handlers = (
      action as unknown as {
        authorizationHandlers(): Record<string, unknown>;
      }
    ).authorizationHandlers();

    expect(Object.keys(handlers)).toEqual([]);
  });
});
