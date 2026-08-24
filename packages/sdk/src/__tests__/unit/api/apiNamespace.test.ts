/**
 * `sdk.api.withdrawals()` — the renamed read
 *
 * The namespace binds `env` once and forwards everything else, so the only way
 * a method here goes wrong is by dropping an argument or by calling the wrong
 * underlying function. Neither shows up as an error: a dropped filter returns
 * *more* records than asked for, and the caller sees a longer list rather than
 * a failure.
 *
 * Worth pinning now because 6.0.0 renamed the method — the export-surface
 * snapshot caught the name, but nothing asserted the call underneath it.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The exact specifier `ApiNamespace` imports — the barrel re-export is a
// different module id, and mocking that one leaves the real call in place.
vi.mock(
  '../../../api-functions/getUnstakesByAddress/getUnstakesByAddress',
  () => ({ getUnstakesByAddress: vi.fn(async () => []) }),
);

import { getUnstakesByAddress } from '../../../api-functions/getUnstakesByAddress/getUnstakesByAddress';
import { ApiNamespace } from '../../../client/ApiNamespace';

const ADDRESS = '0x1b9409e49564d2c0bfc900ba7de6aeb258d88268';

describe('sdk.api.withdrawals()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the address and the namespace env through', async () => {
    await new ApiNamespace(Env.prod).withdrawals(ADDRESS);

    expect(getUnstakesByAddress).toHaveBeenCalledWith({
      address: ADDRESS,
      env: Env.prod,
      options: undefined,
    });
  });

  /**
   * The filters keep the endpoint's own names. Translating them here would put
   * a mapping between the caller and the wire that nothing else knows about.
   */
  it('forwards the wire filters unchanged', async () => {
    const options = {
      show_redeems: true,
      show_unstakes: false,
      to_native: true,
    };

    await new ApiNamespace(Env.stage).withdrawals(ADDRESS, options);

    expect(getUnstakesByAddress).toHaveBeenCalledWith({
      address: ADDRESS,
      env: Env.stage,
      options,
    });
  });

  it('binds the env it was constructed with, not a default', async () => {
    await new ApiNamespace(Env.stage).withdrawals(ADDRESS);

    expect(getUnstakesByAddress).toHaveBeenCalledWith(
      expect.objectContaining({ env: Env.stage }),
    );
  });

  /**
   * The old name is gone rather than deprecated, and on plain JavaScript that
   * is `undefined is not a function` at the call site — so it is asserted by
   * name, the same way the removed verbs are.
   */
  it('no longer answers to the old name', () => {
    const api = new ApiNamespace(Env.prod) as unknown as Record<string, unknown>;

    expect(api.unstakes).toBeUndefined();
    expect(typeof api.withdrawals).toBe('function');
  });
});
