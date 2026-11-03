/**
 * `sdk.api.deposits()` and `withdrawals()` read v2 when the SDK has a wallet
 * token, and fall back to the public v1 routes only when it has none. Any
 * other v2 failure reaches the caller: a silent fallback would hide a broken
 * v2 read behind v1 data.
 */
import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock(
  '../../../api-functions/getDepositsByAddress/getDepositsByAddress',
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getDepositsByAddress: vi.fn(async () => ['v1']),
  }),
);
vi.mock(
  '../../../api-functions/getUnstakesByAddress/getUnstakesByAddress',
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getUnstakesByAddress: vi.fn(async () => ['v1']),
  }),
);
vi.mock(
  '../../../api-functions/getPortfolioMovements/getPortfolioMovements',
  () => ({
    getPortfolioDeposits: vi.fn(async () => ['v2']),
    getPortfolioWithdrawals: vi.fn(async () => ['v2']),
    getPortfolioBridges: vi.fn(async () => ['v2']),
  }),
);

import { getDepositsByAddress } from '../../../api-functions/getDepositsByAddress/getDepositsByAddress';
import {
  getPortfolioBridges,
  getPortfolioDeposits,
  getPortfolioWithdrawals,
} from '../../../api-functions/getPortfolioMovements/getPortfolioMovements';
import { getUnstakesByAddress } from '../../../api-functions/getUnstakesByAddress/getUnstakesByAddress';
import { ApiNamespace } from '../../../client/ApiNamespace';
import { AuthErrorCode, LombardError } from '../../../shared/errors';

const ADDRESS = '0x00000000000000000000000000000000000000aa';
const auth: LombardAuth = { getToken: async () => 'jwt' };

describe('sdk.api portfolio reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads v1 unless the config opts into v2', async () => {
    const api = new ApiNamespace(Env.stage, auth);

    expect(await api.deposits(ADDRESS)).toEqual(['v1']);
    expect(await api.withdrawals(ADDRESS)).toEqual(['v1']);
    expect(getPortfolioDeposits).not.toHaveBeenCalled();
    expect(api.getApiVersion()).toBe('v1');
  });

  it('reads v2 with the configured auth', async () => {
    const api = new ApiNamespace(Env.stage, auth, 'v2');
    const options = { to_native: true };

    expect(await api.deposits(ADDRESS)).toEqual(['v2']);
    expect(await api.withdrawals(ADDRESS, options)).toEqual(['v2']);
    expect(getPortfolioDeposits).toHaveBeenCalledWith({
      address: ADDRESS,
      env: Env.stage,
      auth,
    });
    expect(getPortfolioWithdrawals).toHaveBeenCalledWith({
      address: ADDRESS,
      env: Env.stage,
      auth,
      options,
    });
    expect(getDepositsByAddress).not.toHaveBeenCalled();
    expect(api.getApiVersion()).toBe('v2');
  });

  it('falls back to v1 when auth has no token for the call', async () => {
    const missing = new LombardError(AuthErrorCode.MISSING_TOKEN, 'no token');
    vi.mocked(getPortfolioDeposits).mockRejectedValueOnce(missing);
    vi.mocked(getPortfolioWithdrawals).mockRejectedValueOnce(missing);
    const api = new ApiNamespace(Env.stage, auth, 'v2');

    expect(await api.deposits(ADDRESS)).toEqual(['v1']);
    expect(await api.withdrawals(ADDRESS)).toEqual(['v1']);
    expect(getUnstakesByAddress).toHaveBeenCalledTimes(1);
  });

  it('surfaces any other v2 failure instead of reading v1', async () => {
    vi.mocked(getPortfolioDeposits).mockRejectedValueOnce(new Error('500'));
    const api = new ApiNamespace(Env.stage, auth, 'v2');

    await expect(api.deposits(ADDRESS)).rejects.toThrow('500');
    expect(getDepositsByAddress).not.toHaveBeenCalled();
  });

  it('reads bridges from v2 only', async () => {
    const api = new ApiNamespace(Env.stage, auth);

    expect(await api.bridges(ADDRESS)).toEqual(['v2']);
    expect(getPortfolioBridges).toHaveBeenCalledWith({
      address: ADDRESS,
      env: Env.stage,
      auth,
    });
  });
});
