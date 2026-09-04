/**
 * One event vocabulary, and the wire values it must keep
 *
 * `shared/events.ts` once declared the same five events nine times over, one
 * const object and one handler map per operation, with byte-identical members.
 * They collapsed to a single `ActionEvent` / `ActionEventMap`; 6.0.0 then
 * removed the nine deprecated aliases, for the same reason the verbs went
 * without delegators — a name kept alive is a name that keeps getting copied.
 *
 * The whole safety argument is that the **wire values did not change**, so any
 * consumer subscribing by string keeps working through both steps. That is what
 * this file pins, along with the absence of the aliases: on plain JavaScript a
 * removed const is `undefined`, not an error, so `StakeEvent.Progress` would
 * throw somewhere unrelated rather than at the import.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import * as events from '../../../shared/events';
import {
  ActionEvent,
  type ActionEventMap,
  type StrategyEvent,
  type StrategyEventHandlerMap,
  type StrategyEventMap,
} from '../../../shared/events';

/**
 * The frozen wire contract. Changing any value here breaks every consumer that
 * subscribes by string, which is the point of spelling it out as a literal
 * rather than deriving it from the enum under test.
 */
const WIRE_VALUES = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error',
} as const;

describe('the wire values', () => {
  for (const [member, value] of Object.entries(WIRE_VALUES)) {
    it(`ActionEvent.${member} is "${value}"`, () => {
      expect(ActionEvent[member as keyof typeof ActionEvent]).toBe(value);
    });
  }

  it('has exactly these five members, and no more', () => {
    expect(Object.keys(ActionEvent).sort()).toEqual(
      Object.keys(WIRE_VALUES).sort(),
    );
  });
});

/**
 * Asserted by name against the module object, because a type-level check cannot
 * see a value that is merely absent — and absence is the whole claim.
 */
describe('the nine per-operation aliases are gone', () => {
  const removed = [
    'StakeEvent',
    'DepositEvent',
    'RedeemEvent',
    'UnstakeEvent',
    'DeployEvent',
    'WithdrawEvent',
    'BridgeEvent',
    'StakeAndDeployEvent',
    'DepositAndDeployEvent',
  ] as const;

  for (const name of removed) {
    it(`${name} is not exported`, () => {
      expect((events as Record<string, unknown>)[name]).toBeUndefined();
    });

    it(`${name}Map is not exported`, () => {
      expect((events as Record<string, unknown>)[`${name}Map`]).toBeUndefined();
    });
  }
});

/**
 * `StrategyEvent` and `StrategyEventMap` were unions of nine structurally
 * identical types, which made each equivalent to any single member. They are
 * that single type now, and stay exported because they were never per-operation
 * names to begin with.
 */
describe('the strategy aliases still describe the one vocabulary', () => {
  it('StrategyEvent is ActionEvent', () => {
    expectTypeOf<StrategyEvent>().toEqualTypeOf<ActionEvent>();
  });

  it('StrategyEventMap is ActionEventMap', () => {
    expectTypeOf<StrategyEventMap>().toEqualTypeOf<ActionEventMap>();
  });

  /**
   * `StrategyEventHandlerMap` is not an alias — it is the bare index signature
   * `ActionEventMap` extends, and that `extends` is the only reason the map
   * satisfies `BaseAction`'s generic constraint. So the relationship to pin is
   * one-way assignability, not equality.
   */
  it('ActionEventMap still satisfies StrategyEventHandlerMap', () => {
    const asBase: StrategyEventHandlerMap = {} as ActionEventMap;

    expect(asBase).toBeDefined();
    expectTypeOf<ActionEventMap>().toMatchTypeOf<StrategyEventHandlerMap>();
  });
});
