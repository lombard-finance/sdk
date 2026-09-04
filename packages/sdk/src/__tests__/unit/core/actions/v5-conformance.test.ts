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

import { BtcDeployBtcb } from '../../../../chains/btc/actions/deploy-btcb/BtcDeployBtcb';
import { BtcDeployLbtc } from '../../../../chains/btc/actions/deploy-lbtc/BtcDeployLbtc';
import { BtcDepositBtcb } from '../../../../chains/btc/actions/deposit-btcb/BtcDepositBtcb';
import { BtcDepositLbtc } from '../../../../chains/btc/actions/deposit-lbtc/BtcDepositLbtc';
import { EvmClaim } from '../../../../chains/evm/actions/claim/EvmClaim';
import { EvmDeploy } from '../../../../chains/evm/actions/deploy/EvmDeploy';
import { EvmDepositBtcb } from '../../../../chains/evm/actions/deposit-btcb/EvmDepositBtcb';
import { EvmWithdrawBtcb } from '../../../../chains/evm/actions/withdraw-btcb/EvmWithdrawBtcb';
import { EvmWithdrawLbtc } from '../../../../chains/evm/actions/withdraw-lbtc/EvmWithdrawLbtc';
import { EvmCancelWithdraw } from '../../../../chains/evm/actions/withdraw-vault/EvmCancelWithdraw';
import { EvmWithdrawVault } from '../../../../chains/evm/actions/withdraw-vault/EvmWithdrawVault';
import { SolanaDepositBtcb } from '../../../../chains/solana/actions/deposit-btcb/SolanaDepositBtcb';
import { SolanaWithdrawBtcb } from '../../../../chains/solana/actions/withdraw-btcb/SolanaWithdrawBtcb';
import { SolanaWithdrawLbtc } from '../../../../chains/solana/actions/withdraw-lbtc/SolanaWithdrawLbtc';
import { StarknetWithdraw } from '../../../../chains/starknet/actions/withdraw/StarknetWithdraw';
import { SuiWithdraw } from '../../../../chains/sui/actions/withdraw/SuiWithdraw';

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
  {
    name: 'BtcDepositLbtc',
    ctor: BtcDepositLbtc,
    target: 'BitcoinSourceAction',
  },
  {
    name: 'BtcDepositBtcb',
    ctor: BtcDepositBtcb,
    target: 'BitcoinSourceAction',
  },
  {
    name: 'BtcDeployLbtc',
    ctor: BtcDeployLbtc,
    target: 'BitcoinSourceAction',
  },
  {
    name: 'BtcDeployBtcb',
    ctor: BtcDeployBtcb,
    target: 'BitcoinSourceAction',
  },
  {
    name: 'EvmDepositBtcb',
    ctor: EvmDepositBtcb,
    target: 'FeeAuthorizedAction',
  },
  {
    name: 'EvmWithdrawLbtc',
    ctor: EvmWithdrawLbtc,
    target: 'FeeAuthorizedAction',
  },
  {
    name: 'EvmWithdrawBtcb',
    ctor: EvmWithdrawBtcb,
    target: 'FeeAuthorizedAction',
  },
  { name: 'EvmClaim', ctor: EvmClaim, target: 'ClaimableAction' },
  { name: 'EvmDeploy', ctor: EvmDeploy, target: 'Action' },
  { name: 'EvmWithdrawVault', ctor: EvmWithdrawVault, target: 'Action' },
  {
    name: 'EvmCancelWithdraw',
    ctor: EvmCancelWithdraw,
    target: 'CancellableAction',
  },
  { name: 'SolanaDepositBtcb', ctor: SolanaDepositBtcb, target: 'Action' },
  { name: 'SolanaWithdrawLbtc', ctor: SolanaWithdrawLbtc, target: 'Action' },
  { name: 'SolanaWithdrawBtcb', ctor: SolanaWithdrawBtcb, target: 'Action' },
  { name: 'SuiWithdraw', ctor: SuiWithdraw, target: 'Action' },
  { name: 'StarknetWithdraw', ctor: StarknetWithdraw, target: 'Action' },
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
