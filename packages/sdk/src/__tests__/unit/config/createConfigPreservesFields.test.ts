/**
 * `createConfig` must not drop what a caller sets
 *
 * `validateAndApplyDefaults` builds a fresh object rather than spreading its
 * input, so every settable field has to be copied by hand. Two were missed:
 * `getAuthToken` when it was added, and `auth` when it replaced it. Both were
 * accepted by the type and silently discarded, so the wallet token never
 * reached a request made through `createLombardSDK` — the documented entry
 * point — while the bare facades threaded it correctly.
 *
 * The earlier plumbing test could not catch this: it builds `LombardConfig`
 * literals and hands them straight to the facades, which skips the builder
 * entirely. This covers the builder, and covers it by enumeration rather than
 * one field at a time, so the *next* field cannot be dropped quietly either.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { createConfig } from '../../../client/createConfig';

/**
 * Every optional field a caller can set on `createConfig`, with a recognisable
 * value. A field added to `CreateConfigOptions` and not to this table is the gap
 * this file exists to close — so the count is asserted too.
 */
const SETTABLE_FIELDS = {
  partner: { partnerId: 'partner-under-test' },
  auth: { getToken: async () => 'token-under-test' },
  getAuthToken: () => 'legacy-token-under-test',
} as const;

describe('createConfig', () => {
  it('preserves every field a caller sets', () => {
    const config = createConfig({
      env: Env.prod,
      providers: {},
      ...SETTABLE_FIELDS,
    });

    const dropped = Object.keys(SETTABLE_FIELDS).filter(
      (key) => (config as unknown as Record<string, unknown>)[key] === undefined,
    );

    expect(dropped, 'these were accepted and discarded').toEqual([]);
  });

  it('preserves them by identity, not by copy', () => {
    const config = createConfig({
      env: Env.prod,
      providers: {},
      ...SETTABLE_FIELDS,
    });

    // The auth provider is stateful on the host side, so a structural clone
    // would be a different object reading different state.
    expect(config.auth).toBe(SETTABLE_FIELDS.auth);
    expect(config.getAuthToken).toBe(SETTABLE_FIELDS.getAuthToken);
  });

  it('leaves them undefined when unset, rather than inventing a default', () => {
    const config = createConfig({ env: Env.prod, providers: {} });

    expect(config.auth).toBeUndefined();
    expect(config.getAuthToken).toBeUndefined();
  });

  it('still applies its defaults', () => {
    const config = createConfig({ env: Env.prod });

    expect(config.env).toBe(Env.prod);
    expect(config.providers).toEqual({});
    // Built-in modules are merged in, so this is never empty.
    expect(config.modules?.length ?? 0).toBeGreaterThan(0);
  });

  // A reminder to extend the table above rather than let it fall behind.
  it('covers the fields the table claims to cover', () => {
    expect(Object.keys(SETTABLE_FIELDS)).toEqual([
      'partner',
      'auth',
      'getAuthToken',
    ]);
  });
});
