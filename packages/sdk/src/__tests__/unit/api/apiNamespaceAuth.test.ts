/**
 * The vault withdrawal reads on this namespace send no wallet token.
 *
 * Their route is on the BFF and serves any address's history without one, so
 * the namespace does not hand the ops its `auth`: with or without a provider,
 * they are called with none. `unit/vaults/allChainsAuth.test.ts` runs the real
 * ops against a mocked HTTP boundary and asserts nothing reaches the wire.
 *
 * @module __tests__/unit/api/apiNamespaceAuth.test
 */

import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it, vi } from 'vitest';

import { ApiNamespace } from '../../../client/ApiNamespace';

vi.mock('../../../vaults/lib/ops/get-vault-withdrawals', () => ({
  getEarnWithdrawals: vi.fn(async () => ({
    cancelled: [],
    expired: [],
    fulfilled: [],
    open: [],
    failures: [],
  })),
  getEarnWithdrawalsAllChains: vi.fn(async () => ({
    cancelled: [],
    expired: [],
    fulfilled: [],
    open: [],
    failures: [],
  })),
}));

const ADDRESS = '0x0F90793a54E809bf708bd0FbCC63d311E3bb1BE1';

/** A provider that records nothing; identity is all these assertions need. */
const auth: LombardAuth = {
  getToken: async () => 'a-token',
};

describe('ApiNamespace vault withdrawals', () => {
  it('hands no provider to the all-chains read', async () => {
    const ops = await import('../../../vaults/lib/ops/get-vault-withdrawals');

    await new ApiNamespace(Env.prod, auth).vaultWithdrawals(ADDRESS);

    const [params] = vi.mocked(ops.getEarnWithdrawalsAllChains).mock.calls[0];
    expect(params).not.toHaveProperty('auth');
    expect(params).toMatchObject({ account: ADDRESS, env: Env.prod });
  });

  it('hands none to the single-chain read either', async () => {
    const ops = await import('../../../vaults/lib/ops/get-vault-withdrawals');

    await new ApiNamespace(Env.prod, auth).vaultWithdrawals(ADDRESS, {
      chainId: 1,
    });

    const [params] = vi.mocked(ops.getEarnWithdrawals).mock.calls[0];
    expect(params).not.toHaveProperty('auth');
    expect(params).toMatchObject({ account: ADDRESS, chainId: 1 });
  });
});
