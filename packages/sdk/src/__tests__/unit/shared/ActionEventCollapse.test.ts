/**
 * Guards the nine-into-one event collapse.
 *
 * `shared/events.ts` previously declared the same five events nine times, once
 * per operation, as nine const objects and nine handler-map interfaces with
 * byte-identical members. They are now one `ActionEvent` / `ActionEventMap` with
 * the old names as deprecated aliases.
 *
 * The whole safety argument is that the *wire values* did not change, so any
 * consumer subscribing by string keeps working. That is what this file pins.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  ActionEvent,
  type ActionEventMap,
  BridgeEvent,
  type BridgeEventMap,
  DeployEvent,
  type DeployEventMap,
  DepositAndDeployEvent,
  type DepositAndDeployEventMap,
  DepositEvent,
  type DepositEventMap,
  RedeemEvent,
  type RedeemEventMap,
  StakeAndDeployEvent,
  type StakeAndDeployEventMap,
  StakeEvent,
  type StakeEventMap,
  type StrategyEvent,
  type StrategyEventHandlerMap,
  type StrategyEventMap,
  UnstakeEvent,
  type UnstakeEventMap,
  WithdrawEvent,
  type WithdrawEventMap,
} from '../../../shared/events';

/** The frozen wire contract. Changing any value here breaks every consumer
 *  that subscribes by string, so this literal is the point of the test. */
const WIRE_VALUES = {
  Progress: 'progress',
  StatusChange: 'status-change',
  Completed: 'completed',
  Failed: 'failed',
  Error: 'error',
} as const;

const DEPRECATED_ALIASES = {
  StakeEvent,
  DepositEvent,
  RedeemEvent,
  UnstakeEvent,
  DeployEvent,
  WithdrawEvent,
  BridgeEvent,
  StakeAndDeployEvent,
  DepositAndDeployEvent,
};

describe('ActionEvent', () => {
  it('has exactly the frozen wire values', () => {
    expect({ ...ActionEvent }).toEqual(WIRE_VALUES);
  });

  it('exposes no members beyond the five', () => {
    expect(Object.keys(ActionEvent).sort()).toEqual(
      Object.keys(WIRE_VALUES).sort(),
    );
  });
});

describe('deprecated per-operation aliases', () => {
  it.each(Object.entries(DEPRECATED_ALIASES))(
    '%s is the same object as ActionEvent',
    (_name, alias) => {
      // Identity, not deep equality: consumers may compare by reference, and a
      // separate-but-equal object would silently break `===`.
      expect(alias).toBe(ActionEvent);
    },
  );

  it.each(Object.entries(DEPRECATED_ALIASES))(
    '%s still carries the original wire values',
    (_name, alias) => {
      expect({ ...alias }).toEqual(WIRE_VALUES);
    },
  );
});

describe('handler map types', () => {
  it('every deprecated map alias resolves to ActionEventMap', () => {
    expectTypeOf<StakeEventMap>().toEqualTypeOf<ActionEventMap>();
    expectTypeOf<DepositEventMap>().toEqualTypeOf<ActionEventMap>();
    expectTypeOf<RedeemEventMap>().toEqualTypeOf<ActionEventMap>();
    expectTypeOf<UnstakeEventMap>().toEqualTypeOf<ActionEventMap>();
    expectTypeOf<DeployEventMap>().toEqualTypeOf<ActionEventMap>();
    expectTypeOf<WithdrawEventMap>().toEqualTypeOf<ActionEventMap>();
    expectTypeOf<BridgeEventMap>().toEqualTypeOf<ActionEventMap>();
    expectTypeOf<StakeAndDeployEventMap>().toEqualTypeOf<ActionEventMap>();
    expectTypeOf<DepositAndDeployEventMap>().toEqualTypeOf<ActionEventMap>();
  });

  it('the generic aliases resolve to the canonical types', () => {
    expectTypeOf<StrategyEventMap>().toEqualTypeOf<ActionEventMap>();
    expectTypeOf<StrategyEvent>().toEqualTypeOf<ActionEvent>();
  });

  it('keeps the index signature action classes depend on', () => {
    // ActionEventMap must remain assignable to the handler-map constraint, or
    // BaseAction's generic bound rejects every action class at once. Asserted
    // as a compile-time conditional so it fails the build, not just the run.
    type Satisfies = ActionEventMap extends StrategyEventHandlerMap
      ? true
      : false;
    const satisfies: Satisfies = true;
    expect(satisfies).toBe(true);
  });
});
