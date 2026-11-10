/**
 * The Earn vault history reads and the public metrics send no wallet token.
 *
 * Their routes sit on the BFF, not the API gateway. They serve any address's
 * vault history, and nothing behind them reads a token, so labelling them
 * user-scoped bought nothing: a caller without `auth` failed before sending,
 * and a caller with it sent the user's gateway session to a host that has no
 * use for it, where a 401 from anything in between would end that session.
 *
 * These run the real ops and the real `httpRequest`, with only axios mocked,
 * so what is asserted is what would have gone on the wire.
 */

import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { axiosFn } = vi.hoisted(() => ({ axiosFn: vi.fn() }));
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: () => false }));

import { getLBTCStats } from '../../../metrics/get-lbtc-stats';
import { EARN_CHAINS } from '../../../vaults/lib/config';
import { getEarnApy } from '../../../vaults/lib/metrics/get-vault-apy';
import { getEarnTVL } from '../../../vaults/lib/metrics/get-vault-tvl';
import {
  getEarnDeposits,
  getEarnDepositsAllChains,
} from '../../../vaults/lib/ops/get-vault-deposits';
import {
  getEarnWithdrawals,
  getEarnWithdrawalsAllChains,
} from '../../../vaults/lib/ops/get-vault-withdrawals';

const ACCOUNT = '0x0F90793a54E809bf708bd0FbCC63d311E3bb1BE1';

const getToken = vi.fn(async () => 'a-token');
const auth: LombardAuth = { getToken };

/** What each request carried, by URL. */
function sent() {
  return axiosFn.mock.calls.map(([config]) => {
    const { url, headers } = config as {
      url: string;
      headers: Record<string, string>;
    };
    return { url, authorization: headers.Authorization };
  });
}

beforeEach(() => {
  axiosFn.mockReset();
  getToken.mockClear();
  // An empty but well-shaped answer per route, so the ops parse it.
  axiosFn.mockImplementation(async ({ url }: { url: string }) => ({
    status: 200,
    headers: {},
    data: url.includes('/deposits/')
      ? []
      : {
          cancelled_requests: [],
          expired_requests: [],
          fulfilled_requests: [],
          open_requests: [],
        },
  }));
});

describe('the Earn vault history reads', () => {
  it.each([
    [
      'getEarnDeposits',
      () =>
        getEarnDeposits({ account: ACCOUNT, chainId: 1, env: Env.prod, auth }),
    ],
    [
      'getEarnWithdrawals',
      () =>
        getEarnWithdrawals({
          account: ACCOUNT,
          chainId: 1,
          env: Env.prod,
          auth,
        }),
    ],
  ])('%s sends no token, even given auth', async (_name, read) => {
    await read();

    expect(sent()).toEqual([
      {
        url: expect.stringMatching(/^https:\/\/bff\.prod\.lombard-fi\.com\//),
        authorization: undefined,
      },
    ]);
    expect(getToken).not.toHaveBeenCalled();
  });

  // A 5.x caller has no `auth`; the read worked for it then and works now.
  it.each([
    [
      'getEarnDeposits',
      () => getEarnDeposits({ account: ACCOUNT, chainId: 1, env: Env.prod }),
    ],
    [
      'getEarnWithdrawals',
      () => getEarnWithdrawals({ account: ACCOUNT, chainId: 1, env: Env.prod }),
    ],
  ])('%s is sent without auth', async (_name, read) => {
    await expect(read()).resolves.toBeDefined();
    expect(axiosFn).toHaveBeenCalledTimes(1);
  });

  it('the all-chains reads send one tokenless request per Earn chain', async () => {
    await getEarnWithdrawalsAllChains({
      account: ACCOUNT,
      env: Env.prod,
      auth,
    });
    await getEarnDepositsAllChains({ account: ACCOUNT, env: Env.prod, auth });

    expect(sent()).toHaveLength(2 * EARN_CHAINS.length);
    expect(sent().every((r) => r.authorization === undefined)).toBe(true);
  });
});

describe('the public metrics', () => {
  it.each([
    ['getLBTCStats', () => getLBTCStats({ env: Env.prod, auth })],
    ['getEarnTVL', () => getEarnTVL({ env: Env.prod, auth })],
    ['getEarnApy', () => getEarnApy({ env: Env.prod, auth })],
  ])('%s sends no token, even given auth', async (_name, read) => {
    // The answers are not shaped for these parsers; what was sent is the
    // assertion, and it is made before parsing.
    await read().catch(() => undefined);

    expect(sent().length).toBeGreaterThan(0);
    expect(sent().every((r) => r.authorization === undefined)).toBe(true);
    expect(getToken).not.toHaveBeenCalled();
  });
});
