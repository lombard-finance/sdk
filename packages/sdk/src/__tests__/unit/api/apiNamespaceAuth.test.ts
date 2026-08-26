/**
 * `config.auth` reaches the user-scoped API routes.
 *
 * Several routes on this namespace refuse to send without a wallet token: the
 * vault withdraw and deposit reads, and the strategy user metrics. The ops
 * themselves accepted and forwarded `auth` all along, but the namespace was
 * built with `env` alone, so a host that supplied `auth` still saw those calls
 * fail — signing in changed nothing, which is what QA hit on APP-2583.
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

describe('ApiNamespace forwards auth', () => {
  it('hands the provider to the all-chains withdrawals read', async () => {
    const ops = await import('../../../vaults/lib/ops/get-vault-withdrawals');

    await new ApiNamespace(Env.prod, auth).vaultWithdrawals(ADDRESS);

    expect(ops.getEarnWithdrawalsAllChains).toHaveBeenCalledWith(
      expect.objectContaining({ auth }),
    );
  });

  it('hands it to the single-chain read too', async () => {
    const ops = await import('../../../vaults/lib/ops/get-vault-withdrawals');

    await new ApiNamespace(Env.prod, auth).vaultWithdrawals(ADDRESS, {
      chainId: 1,
    });

    expect(ops.getEarnWithdrawals).toHaveBeenCalledWith(
      expect.objectContaining({ auth }),
    );
  });

  it('passes undefined when the host supplied no provider', async () => {
    const ops = await import('../../../vaults/lib/ops/get-vault-withdrawals');
    vi.mocked(ops.getEarnWithdrawalsAllChains).mockClear();

    await new ApiNamespace(Env.prod).vaultWithdrawals(ADDRESS);

    expect(ops.getEarnWithdrawalsAllChains).toHaveBeenCalledWith(
      expect.objectContaining({ auth: undefined }),
    );
  });
});
