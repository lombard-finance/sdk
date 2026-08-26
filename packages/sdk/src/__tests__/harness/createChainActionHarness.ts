/**
 * Chain-source action test harness — EVM, Solana, Sui, Starknet.
 *
 * The BTC harness covers Bitcoin-source actions, whose context is unusually
 * large: `BtcCoreContext` carries `btc`, `api` and `capabilities` on top of
 * `CoreContext`. The other four chains are far simpler — each context is
 * `CoreContext` plus exactly one service — so one harness covers all of them,
 * keyed on which service to install.
 *
 * This exists for the same reason the BTC one does. Ten of the twelve non-BTC
 * action classes have no instantiating test, so the alias-parity goldens the
 * 6.0.0 migration is sold on could only be captured for BTC. Capturing the rest
 * is only possible *before* the merges land.
 *
 * Design notes, carried over deliberately:
 *
 * - Services are **total**, overrides are partial. A `Partial` service injected
 *   directly turns an un-stubbed method into a bare `TypeError`, which cannot
 *   distinguish "method missing" from "called with the wrong arguments".
 * - Calls, statuses and progress payloads are recorded **in order**, because
 *   ordering is what lets a golden assert a lifecycle rather than an end state.
 * - `getProvider` returns a stub by default. Actions that reach for a wallet
 *   client resolve one; actions that check for absence can override it to
 *   `undefined` and get the real "provider missing" path.
 *
 * @module __tests__/harness/createChainActionHarness
 */

import { Env } from '@lombard.finance/sdk-common';
import { vi } from 'vitest';

import { PartnerConfiguration } from '../../client/PartnerConfiguration';

export const MOCK_TX_HASH = '0xmocktxhash';
export const MOCK_SIGNATURE = '0xmocksignature';
export const MOCK_PUBKEY = '0xmockpubkey';
export const MOCK_EVM_ACCOUNT = '0x1111111111111111111111111111111111111111';

export interface RecordedCall {
  readonly target: string;
  readonly method: string;
  readonly args: readonly unknown[];
}

export interface RecordedCalls {
  readonly all: RecordedCall[];
  of(target: string, method: string): ReadonlyArray<readonly unknown[]>;
  /** `['sui.withdraw', ...]` — the shape a snapshot compares. */
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

function record<T extends Record<string, unknown>>(
  target: string,
  stub: T,
  calls: RecordedCalls,
): T {
  const out: Record<string, unknown> = {};
  for (const [method, impl] of Object.entries(stub)) {
    out[method] =
      typeof impl === 'function'
        ? (...args: unknown[]) => {
            (calls.all as RecordedCall[]).push({ target, method, args });
            return (impl as (...a: unknown[]) => unknown)(...args);
          }
        : impl;
  }
  return out as T;
}

/** Which chain service to install on the context. */
export type ChainKind = 'evm' | 'solana' | 'sui' | 'starknet';

/* eslint-disable @typescript-eslint/no-explicit-any -- the harness builds
   structurally-typed doubles for four different service interfaces; naming each
   one here would duplicate sdk-common's types for no added safety. */
type AnyService = Record<string, any>;

/** Total stubs, one per chain service. Every method returns a schema-valid default. */
function defaultService(kind: ChainKind): AnyService {
  switch (kind) {
    case 'sui':
      return {
        signLbtcDestination: async () => ({ signature: MOCK_SIGNATURE }),
        unstake: async () => ({ txHash: MOCK_TX_HASH }),
      };
    case 'starknet':
      return {
        signLbtcDestination: async () => ({
          signature: MOCK_SIGNATURE,
          pubKey: MOCK_PUBKEY,
        }),
        unstake: async () => ({ txHash: MOCK_TX_HASH }),
      };
    case 'solana':
      return {
        signLbtcDestination: async () => ({ signature: MOCK_SIGNATURE }),
        deposit: async () => ({ txHash: MOCK_TX_HASH }),
        redeem: async () => ({ txHash: MOCK_TX_HASH }),
        redeemForBtc: async () => ({ txHash: MOCK_TX_HASH }),
      };
    case 'evm':
      return {
        signLbtcDestination: async () => ({ signature: MOCK_SIGNATURE }),
        signNetworkFee: async () => ({
          signature: MOCK_SIGNATURE,
          typedData: '{"mock":"typedData"}',
        }),
        signStakeAndBake: async () => ({
          signature: MOCK_SIGNATURE,
          typedData: '{"mock":"typedData"}',
        }),
        getMintingFee: async () => '1000',
        getStakeAndBakeFee: async () => '1000',
      };
  }
}

export interface ChainHarnessOptions {
  readonly env?: Env;
  /** Partial overrides merged over the total service stub. */
  readonly service?: AnyService;
  /** Return `undefined` to exercise the provider-missing path. */
  readonly getProvider?: (kind: string) => unknown;
}

export interface ChainHarness<TCtx = any> {
  readonly ctx: TCtx;
  readonly calls: RecordedCalls;
  /** Statuses in the order they were emitted. */
  readonly statuses: string[];
  /** Raw progress payloads, in order. */
  readonly progress: unknown[];
  /** Subscribe to an action so its lifecycle is recorded. */
  observe(action: {
    on(event: string, handler: (...args: any[]) => void): unknown;
  }): void;
}

export function createChainActionHarness<TCtx = any>(
  kind: ChainKind,
  options: ChainHarnessOptions = {},
): ChainHarness<TCtx> {
  const env = options.env ?? Env.prod;
  const calls = createRecorder();
  const statuses: string[] = [];
  const progress: unknown[] = [];

  const service = record(
    kind,
    { ...defaultService(kind), ...options.service },
    calls,
  );

  const ctx = {
    env,
    partner: new PartnerConfiguration(undefined),
    getProvider:
      options.getProvider ??
      (async () => ({
        request: vi.fn(async () => [MOCK_EVM_ACCOUNT]),
        sendBitcoin: undefined,
      })),
    [kind]: service,
  } as unknown as TCtx;

  return {
    ctx,
    calls,
    statuses,
    progress,
    observe(action) {
      action.on('status-change', (...args: unknown[]) => {
        const s = args[0];
        statuses.push(typeof s === 'string' ? s : JSON.stringify(s));
      });
      action.on('progress', (...args: unknown[]) => {
        progress.push(args[0]);
      });
    },
  };
}
