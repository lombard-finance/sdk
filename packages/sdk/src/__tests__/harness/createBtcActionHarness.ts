/**
 * BTC action test harness.
 *
 * Replaces the hand-rolled `createMockContext()` variants for Bitcoin-source
 * actions and gives them something none of the existing BTC tests have: an
 * actual instance of the class under test, plus ordered recordings of what it
 * did.
 *
 * The four BTC action classes have **zero** instantiating tests today — the
 * eleven files under `__tests__/unit/btc/` assert on object literals and never
 * import a class. That is why an action which threw on every call shipped
 * through two majors undetected.
 *
 * Design notes:
 *
 * - Services are **total**, overrides are partial. Every method is stubbed with
 *   a schema-valid default, then callers override what a given test cares
 *   about. A `Partial` service injected directly would turn an un-stubbed
 *   method into a bare `TypeError`, which cannot distinguish "method missing"
 *   from "called with the wrong arguments".
 * - Calls, statuses and progress payloads are recorded **in order**. Ordering
 *   is what lets a test assert a lifecycle rather than an end state, and it is
 *   what the golden baseline in `golden/` compares.
 *
 * @module __tests__/harness/createBtcActionHarness
 */

import { Env } from '@lombard.finance/sdk-common';
import { vi } from 'vitest';

import { PartnerConfiguration } from '../../client/PartnerConfiguration';
import type { BtcCoreContext } from '../../shared/context';

export const MOCK_DEPOSIT_ADDRESS =
  'tb1qmockdepositaddressforharness0000000000';
export const MOCK_SIGNATURE = '0xmocksignature';
export const MOCK_TYPED_DATA = '{"mock":"typedData"}';

/** One recorded interaction, in the order it happened. */
export interface RecordedCall {
  readonly target: string;
  readonly method: string;
  readonly args: readonly unknown[];
}

export interface RecordedCalls {
  readonly all: RecordedCall[];
  /** Every argument list a given method received, in order. */
  of(target: string, method: string): ReadonlyArray<readonly unknown[]>;
  /** `['api.getDepositAddress', 'evm.signStakeAndBake', ...]` — for snapshots. */
  sequence(): string[];
}

function createRecorder(): RecordedCalls {
  const all: RecordedCall[] = [];
  return {
    all,
    of(target, method) {
      return all
        .filter((c) => c.target === target && c.method === method)
        .map((c) => c.args);
    },
    sequence() {
      return all.map((c) => `${c.target}.${c.method}`);
    },
  };
}

/**
 * Wrap every method of a stub object so calls land in the recorder, preserving
 * the stub's return value.
 */
function record<T extends Record<string, unknown>>(
  target: string,
  stub: T,
  calls: RecordedCalls,
): T {
  const out: Record<string, unknown> = {};
  for (const [method, impl] of Object.entries(stub)) {
    out[method] =
      typeof impl === 'function'
        ? vi.fn(async (...args: unknown[]) => {
            calls.all.push({ target, method, args });
            return (impl as (...a: unknown[]) => unknown)(...args);
          })
        : impl;
  }
  return out as T;
}

/** Total ApiService surface the BTC flow touches. */
function defaultApi() {
  return {
    generateDepositAddress: async () => MOCK_DEPOSIT_ADDRESS,
    // No pre-existing deposit by default — the non-resume path. Typed wide so
    // a test can override it with an address.
    getDepositAddress: async (): Promise<string | undefined> => undefined,
    getDeposits: async () => [],
    // FeeSignatureResult is a total object, never undefined — see
    // sdk-common/src/services/api.ts:88. Returning undefined here produced
    // "Cannot read properties of undefined (reading 'hasSignature')", which is
    // a fair illustration of why a total stub beats a partial one.
    getFeeSignature: async () => ({ hasSignature: false }),
    storeFeeSignature: async () => ({ status: 'success' }),
    storeStakeAndBakeSignature: async () => ({ status: 'success' }),
  };
}

/** Total BtcService surface (one method today). */
function defaultBtc() {
  return {
    getCurrentBlockHeight: async () => 800_000,
  };
}

/** Total EvmService surface, reached via capabilities.require('evm'). */
function defaultEvm() {
  return {
    getMintingFee: async () => '1000',
    signNetworkFee: async () => ({
      signature: MOCK_SIGNATURE,
      typedData: MOCK_TYPED_DATA,
    }),
    getStakeAndBakeFee: async () => '2000',
    signStakeAndBake: async () => ({
      signature: MOCK_SIGNATURE,
      typedData: MOCK_TYPED_DATA,
    }),
    signLbtcDestination: async () => ({
      signature: MOCK_SIGNATURE,
      typedData: MOCK_TYPED_DATA,
    }),
  };
}

export interface BtcHarnessOptions {
  env?: Env;
  api?: Partial<ReturnType<typeof defaultApi>>;
  btc?: Partial<ReturnType<typeof defaultBtc>>;
  evm?: Partial<ReturnType<typeof defaultEvm>>;
  partnerId?: string;
}

export interface BtcHarness {
  ctx: BtcCoreContext;
  calls: RecordedCalls;
  /** Attach to an action to record its emissions in order. */
  observe(action: {
    on(event: string, handler: (...args: unknown[]) => void): unknown;
  }): void;
  statuses: string[];
  progress: unknown[];
}

export function createBtcActionHarness(
  opts: BtcHarnessOptions = {},
): BtcHarness {
  const calls = createRecorder();
  const statuses: string[] = [];
  const progress: unknown[] = [];

  const api = record('api', { ...defaultApi(), ...opts.api }, calls);
  const btc = record('btc', { ...defaultBtc(), ...opts.btc }, calls);
  const evm = record('evm', { ...defaultEvm(), ...opts.evm }, calls);

  const ctx = {
    env: opts.env ?? Env.prod,
    partner: new PartnerConfiguration({
      partnerId: opts.partnerId ?? 'test-partner',
    }),
    getProvider: vi.fn().mockResolvedValue({
      request: vi.fn().mockResolvedValue(['0xaccount']),
    }),
    api,
    btc,
    capabilities: {
      require: (id: string) => {
        calls.all.push({
          target: 'capabilities',
          method: 'require',
          args: [id],
        });
        if (id === 'evm') return evm;
        throw new Error(`harness: capability '${id}' not stubbed`);
      },
      has: () => true,
    },
  } as unknown as BtcCoreContext;

  return {
    ctx,
    calls,
    statuses,
    progress,
    observe(action) {
      action.on('status-change', (...args) => {
        statuses.push(String(args[0]));
      });
      action.on('progress', (...args) => {
        progress.push(args[0]);
      });
    },
  };
}
