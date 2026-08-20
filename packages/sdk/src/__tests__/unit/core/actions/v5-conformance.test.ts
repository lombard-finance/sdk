/**
 * How far each v5 class is from its v6 interface
 *
 * B4 asks whether the sixteen v5 classes satisfy the interfaces Stage B lands.
 * Today none of them fully does — `authorize()`, `monitor()`, `applicableSteps`
 * and `route` are what stages C to F add — so asserting conformance now would
 * just fail sixteen times and say nothing useful.
 *
 * Instead this measures the gap and snapshots it. The snapshot is the stage
 * tracker: as each chain lands, its rows shrink, and the diff is the review
 * artifact. It also catches the opposite direction, a member quietly
 * disappearing from a class that already had it.
 *
 * Members are read off the prototype chain rather than an instance, because
 * constructing these classes needs a full context and a provider.
 */

import { describe, expect, it } from 'vitest';

import { BtcDeposit } from '../../../../chains/btc/actions/deposit/BtcDeposit';
import { BtcDepositAndDeploy } from '../../../../chains/btc/actions/depositAndDeploy/BtcDepositAndDeploy';
import { BtcStake } from '../../../../chains/btc/actions/stake/BtcStake';
import { BtcStakeAndDeploy } from '../../../../chains/btc/actions/stakeAndDeploy/BtcStakeAndDeploy';
import { EvmDeploy } from '../../../../chains/evm/actions/deploy/EvmDeploy';
import { EvmDeposit } from '../../../../chains/evm/actions/deposit/EvmDeposit';
import { EvmRedeem } from '../../../../chains/evm/actions/redeem/EvmRedeem';
import { EvmStake } from '../../../../chains/evm/actions/stake/EvmStake';
import { EvmUnstake } from '../../../../chains/evm/actions/unstake/EvmUnstake';
import { EvmCancelWithdraw } from '../../../../chains/evm/actions/withdraw/EvmCancelWithdraw';
import { EvmWithdraw } from '../../../../chains/evm/actions/withdraw/EvmWithdraw';
import { SolanaRedeem } from '../../../../chains/solana/actions/redeem/SolanaRedeem';
import { SolanaStake } from '../../../../chains/solana/actions/stake/SolanaStake';
import { SolanaUnstake } from '../../../../chains/solana/actions/unstake/SolanaUnstake';
import { StarknetUnstake } from '../../../../chains/starknet/actions/unstake/StarknetUnstake';
import { SuiUnstake } from '../../../../chains/sui/actions/unstake/SuiUnstake';

/** The members `Action` requires, excluding the optional `pendingAuthorization`. */
const ACTION_MEMBERS = [
  'status',
  'isLoading',
  'isFailed',
  'error',
  'applicableSteps',
  'route',
  'prepare',
  'authorize',
  'execute',
  'monitor',
] as const;

const EXTRA_MEMBERS = {
  BitcoinSourceAction: ['depositAddress', 'generateDepositAddress'],
  FeeAuthorizedAction: ['feeAuth'],
  ClaimableAction: ['setClaimData'],
  // Omit<Action, 'prepare'> then re-adds prepare, so the member list is the same.
  CancellableAction: [],
} as const;

type Target = keyof typeof EXTRA_MEMBERS | 'Action';

interface Subject {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctor: abstract new (...args: any[]) => object;
  target: Target;
}

const SUBJECTS: Subject[] = [
  { name: 'BtcStake', ctor: BtcStake, target: 'BitcoinSourceAction' },
  { name: 'BtcDeposit', ctor: BtcDeposit, target: 'BitcoinSourceAction' },
  {
    name: 'BtcStakeAndDeploy',
    ctor: BtcStakeAndDeploy,
    target: 'BitcoinSourceAction',
  },
  {
    name: 'BtcDepositAndDeploy',
    ctor: BtcDepositAndDeploy,
    target: 'BitcoinSourceAction',
  },
  { name: 'EvmStake', ctor: EvmStake, target: 'FeeAuthorizedAction' },
  { name: 'EvmUnstake', ctor: EvmUnstake, target: 'FeeAuthorizedAction' },
  { name: 'EvmRedeem', ctor: EvmRedeem, target: 'FeeAuthorizedAction' },
  { name: 'EvmDeposit', ctor: EvmDeposit, target: 'ClaimableAction' },
  { name: 'EvmDeploy', ctor: EvmDeploy, target: 'Action' },
  { name: 'EvmWithdraw', ctor: EvmWithdraw, target: 'Action' },
  {
    name: 'EvmCancelWithdraw',
    ctor: EvmCancelWithdraw,
    target: 'CancellableAction',
  },
  { name: 'SolanaStake', ctor: SolanaStake, target: 'Action' },
  { name: 'SolanaUnstake', ctor: SolanaUnstake, target: 'Action' },
  { name: 'SolanaRedeem', ctor: SolanaRedeem, target: 'Action' },
  { name: 'SuiUnstake', ctor: SuiUnstake, target: 'Action' },
  { name: 'StarknetUnstake', ctor: StarknetUnstake, target: 'Action' },
];

/** Every own property name up the prototype chain, stopping before Object. */
function prototypeMembers(ctor: { prototype: object }): Set<string> {
  const names = new Set<string>();
  let proto: object | null = ctor.prototype;

  while (proto && proto !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name !== 'constructor') names.add(name);
    }
    proto = Object.getPrototypeOf(proto) as object | null;
  }

  return names;
}

function requiredMembers(target: Target): string[] {
  const extra = target === 'Action' ? [] : EXTRA_MEMBERS[target];
  return [...ACTION_MEMBERS, ...extra];
}

function missingMembers(subject: Subject): string[] {
  const present = prototypeMembers(subject.ctor);
  return requiredMembers(subject.target).filter((m) => !present.has(m));
}

describe('v5 to v6 interface conformance', () => {
  it('covers all sixteen classes', () => {
    expect(SUBJECTS).toHaveLength(16);
  });

  it('assigns every class a target interface', () => {
    for (const subject of SUBJECTS) {
      expect(requiredMembers(subject.target).length).toBeGreaterThan(0);
    }
  });

  /**
   * The gap, per class. Every name listed here is work stages C to F have to
   * do; every name that disappears from a list is work that landed.
   *
   * A name *appearing* in a list is a regression: it means a member the class
   * already had has gone away.
   */
  it('reports the remaining gap per class', () => {
    const gap = Object.fromEntries(
      SUBJECTS.map((subject) => [subject.name, missingMembers(subject)]),
    );

    expect(gap).toMatchSnapshot();
  });

  /**
   * The members every class already has are the ones the interfaces were shaped
   * around, so losing one would break all sixteen at once. Asserted separately
   * from the snapshot so the failure names the member rather than showing a diff.
   */
  it.each(SUBJECTS.map((s) => [s.name, s] as const))(
    '%s already carries the BaseAction members',
    (_name, subject) => {
      const present = prototypeMembers(subject.ctor);

      for (const member of ['status', 'isLoading', 'error', 'prepare']) {
        expect(present.has(member), `${member} must not be dropped`).toBe(true);
      }
    },
  );

  it('finds prototype members at all, so an empty sweep cannot pass', () => {
    // Guards the reflection itself: if prototypeMembers ever returned nothing,
    // every gap would look total and every "already carries" check would fail
    // loudly — but a future refactor could make it silently return everything.
    for (const subject of SUBJECTS) {
      expect(
        prototypeMembers(subject.ctor).size,
        `${subject.name} should expose several members`,
      ).toBeGreaterThan(3);
    }
  });
});
