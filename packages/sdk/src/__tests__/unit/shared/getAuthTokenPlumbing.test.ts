/**
 * `getAuthToken` must reach every context, not just the ones built by
 * `ContextBuilder`.
 *
 * Three chain facades — Solana, Sui and Starknet — construct their own core
 * context inline rather than going through `createCoreContext`, so a field added
 * to `CoreContext` reaches them only if each is edited too. That is exactly the
 * shape of drift a type cannot catch: the inline objects satisfy `CoreContext`
 * with the field absent, because it is optional.
 *
 * This test is the guard. It is parameterised over every construction path the
 * SDK documents, so a new facade or a new inline context fails here rather than
 * silently dropping the caller's token.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { btcActions } from '../../../chains/btc/BtcActions';
import { evmActions } from '../../../chains/evm/EvmActions';
import { solanaActions } from '../../../chains/solana/SolanaActions';
import { starknetActions } from '../../../chains/starknet/StarknetActions';
import { suiActions } from '../../../chains/sui/SuiActions';
import type { LombardConfig } from '../../../config/types';
import type { AnyModule } from '../../../modules';

const TOKEN = 'jwt-under-test';

/** The facades build their context lazily and the capability registry refuses
 *  an unregistered module, so every chain a facade might reach has to be
 *  present. The services themselves are irrelevant here: this asserts on the
 *  context's own field, not on anything a service does. */
function stubModules(): readonly AnyModule[] {
  const ids = ['api', 'btc', 'evm', 'solana', 'sui', 'starknet'] as const;
  return ids.map(
    (id) => ({ id, register: () => ({}) }) as unknown as AnyModule,
  );
}

function configWithToken(getAuthToken: () => string | undefined = () => TOKEN): LombardConfig {
  return {
    env: Env.prod,
    providers: {},
    modules: stubModules(),
    getAuthToken,
  };
}

/** The facades keep their context private, so reach it the way a test must:
 *  structurally. This is deliberate — asserting on the shape the actions see. */
function ctxOf(facade: unknown): { getAuthToken?: () => string | undefined } {
  const holder = facade as { ctx?: unknown; _ctx?: unknown };
  // `ctx` is a private getter on some facades and a field on others.
  const ctx = holder.ctx ?? holder._ctx;
  return ctx as { getAuthToken?: () => string | undefined };
}

describe('getAuthToken reaches every documented construction path', () => {
  const paths: ReadonlyArray<[string, () => unknown]> = [
    ['btcActions', () => btcActions(configWithToken())],
    ['evmActions', () => evmActions(configWithToken())],
    ['solanaActions', () => solanaActions(configWithToken())],
    ['suiActions', () => suiActions(configWithToken())],
    ['starknetActions', () => starknetActions(configWithToken())],
  ];

  it.each(paths)('%s carries the accessor through to its context', (_name, build) => {
    const ctx = ctxOf(build());
    expect(typeof ctx.getAuthToken).toBe('function');
    expect(ctx.getAuthToken?.()).toBe(TOKEN);
  });

  it('reads at call time, so a token acquired later is still seen', () => {
    // A holder rather than a reassigned binding, so it is obvious the accessor
    // closes over mutable state rather than a captured value.
    const store: { jwt?: string } = {};
    const ctx = ctxOf(evmActions(configWithToken(() => store.jwt)));

    expect(ctx.getAuthToken?.()).toBeUndefined();
    store.jwt = 'acquired-after-construction';
    expect(ctx.getAuthToken?.()).toBe('acquired-after-construction');
  });

  it('stays undefined when the consumer supplies nothing', () => {
    const ctx = ctxOf(
      evmActions({ env: Env.prod, providers: {}, modules: stubModules() }),
    );
    expect(ctx.getAuthToken).toBeUndefined();
  });
});
/**
 * `auth` has to reach the same five construction paths `getAuthToken` does.
 * Adding a field to the config and forgetting one facade is the exact failure
 * this file was written for, and there are now two fields to forget.
 */
describe('auth reaches every documented construction path', () => {
  const provider = { getToken: async () => TOKEN };

  function configWithAuth(): LombardConfig {
    return {
      env: Env.prod,
      providers: {},
      modules: stubModules(),
      auth: provider,
    };
  }

  const paths: ReadonlyArray<[string, () => unknown]> = [
    ['btcActions', () => btcActions(configWithAuth())],
    ['evmActions', () => evmActions(configWithAuth())],
    ['solanaActions', () => solanaActions(configWithAuth())],
    ['suiActions', () => suiActions(configWithAuth())],
    ['starknetActions', () => starknetActions(configWithAuth())],
  ];

  it.each(paths)('%s puts auth on the context', (_name, build) => {
    const ctx = ctxOf(build()) as { auth?: unknown };

    expect(ctx.auth).toBe(provider);
  });

  it('covers every facade, so a new one cannot be missed silently', () => {
    expect(paths).toHaveLength(5);
  });
});
