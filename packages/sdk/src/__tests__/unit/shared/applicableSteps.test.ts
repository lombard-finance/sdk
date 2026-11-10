/**
 * `applicableSteps`
 *
 * Progress always carries all five step keys, `idle` for the ones a route does
 * not use — filtering the payload instead would leave `steps.settling` typed
 * `StepStatus` but valued `undefined`, and since every known reader uses named
 * access that comparison would be false forever. `applicableSteps` is how a
 * consumer knows which of the five are real for this route.
 *
 * The list is derived, not declared twice: `authorizing` comes from whether the
 * route has any ceremony, and the rest from the route family. That is what stops
 * the two from disagreeing.
 */

import { describe, expect, it } from 'vitest';

import type { ActionStepKey } from '../../../core/actions/steps';
import { ACTION_STEP_KEYS } from '../../../core/actions/steps';
import { BaseAction } from '../../../shared/actions/BaseAction';

type TestStatus = 'idle' | 'needs_approval' | 'ready';

class ChainSourceAction extends BaseAction<Record<string, never>, TestStatus> {
  constructor(private readonly withCeremony: boolean) {
    super('idle');
  }

  protected override authorizationHandlers(): Partial<
    Record<TestStatus, () => Promise<void>>
  > {
    return this.withCeremony ? { needs_approval: async () => undefined } : {};
  }
}

/** Stands in for the BTC family, which waits on funds and settles off-chain. */
class BitcoinSourceAction extends BaseAction<
  Record<string, never>,
  TestStatus
> {
  constructor() {
    super('idle');
  }

  protected override routeSteps(): readonly ActionStepKey[] {
    return ['awaitingFunds', 'submitting', 'confirming', 'settling'];
  }
}

describe('a chain-source route', () => {
  it('reports submitting and confirming when it has no ceremony', () => {
    expect(new ChainSourceAction(false).applicableSteps).toEqual([
      'submitting',
      'confirming',
    ]);
  });

  it('adds authorizing when the route declares a ceremony', () => {
    expect(new ChainSourceAction(true).applicableSteps).toEqual([
      'authorizing',
      'submitting',
      'confirming',
    ]);
  });

  it('never reports awaitingFunds, since it funds itself', () => {
    expect(new ChainSourceAction(true).applicableSteps).not.toContain(
      'awaitingFunds',
    );
  });
});

describe('a Bitcoin-source route', () => {
  it('reports awaitingFunds and settling', () => {
    const steps = new BitcoinSourceAction().applicableSteps;

    expect(steps).toContain('awaitingFunds');
    expect(steps).toContain('settling');
  });
});

describe('ordering', () => {
  // Ordered against ACTION_STEP_KEYS rather than by insertion, so a subclass
  // listing its steps in a different order cannot report them out of sequence.
  it('follows the canonical step order regardless of how a route lists them', () => {
    class ShuffledAction extends BaseAction<Record<string, never>, TestStatus> {
      constructor() {
        super('idle');
      }
      protected override routeSteps(): readonly ActionStepKey[] {
        return ['settling', 'confirming', 'awaitingFunds', 'submitting'];
      }
    }

    expect(new ShuffledAction().applicableSteps).toEqual([
      'awaitingFunds',
      'submitting',
      'confirming',
      'settling',
    ]);
  });

  it('only ever reports keys that exist', () => {
    for (const step of new BitcoinSourceAction().applicableSteps) {
      expect(ACTION_STEP_KEYS).toContain(step);
    }
  });

  it('reports each key at most once', () => {
    class DuplicatingAction extends BaseAction<
      Record<string, never>,
      TestStatus
    > {
      constructor() {
        super('idle');
      }
      protected override routeSteps(): readonly ActionStepKey[] {
        return ['submitting', 'submitting', 'confirming'];
      }
    }

    expect(new DuplicatingAction().applicableSteps).toEqual([
      'submitting',
      'confirming',
    ]);
  });
});
