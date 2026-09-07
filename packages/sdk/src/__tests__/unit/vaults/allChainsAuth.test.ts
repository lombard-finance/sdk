/**
 * The wallet token survives the whole all-chains read.
 *
 * The existing namespace test asserts that `ApiNamespace` *sends* `auth` to
 * these ops, against a stub of the ops module — so the real function never
 * runs and a parameter it fails to forward is invisible. Both `*AllChains`
 * functions did exactly that: `auth` arrives inside `IEnvParam`, so leaving it
 * out of the destructuring type-checks, and the per-chain read then refused
 * before sending. Every chain came back `MISSING_TOKEN` with an empty network
 * log, so the single-chain read worked and the all-chains read could not work
 * at any session state.
 *
 * These tests therefore run the real op and the real per-chain function, and
 * mock only the HTTP boundary. Stubbing the sibling export would not have
 * caught it either: the op calls its module-local binding, not the module
 * object, so a spy on the export is never consulted.
 */

import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * An empty-but-well-shaped payload per route, so the ops parse it without
 * complaint. A bare `{}` also passes these assertions — the request has
 * already been made by the time parsing fails — but the deposits normalizer
 * treats an unrecognised object as a single entry and then throws on its
 * missing fields, which logs a parse failure per chain and reads as a broken
 * test rather than a deliberately empty account.
 */
vi.mock('../../../utils/http', () => ({
  httpRequest: vi.fn(async ({ url }: { url: string }) => ({
    // The deposits route returns a bare array; the withdrawals route an object
    // keyed by request state.
    data: url.includes('/deposits/')
      ? []
      : {
          cancelled_requests: [],
          expired_requests: [],
          fulfilled_requests: [],
          open_requests: [],
        },
  })),
  httpGet: vi.fn(async () => ({ data: {} })),
}));

import { httpRequest } from '../../../utils/http';
import { EARN_CHAINS } from '../../../vaults/lib/config';
import { getEarnDepositsAllChains } from '../../../vaults/lib/ops/get-vault-deposits';
import { getEarnWithdrawalsAllChains } from '../../../vaults/lib/ops/get-vault-withdrawals';

const ACCOUNT = '0x0F90793a54E809bf708bd0FbCC63d311E3bb1BE1';

/** Identity is all these assertions need; the token value is never inspected. */
const auth: LombardAuth = {
  getToken: async () => 'a-token',
};

describe('the all-chains vault reads forward the auth provider', () => {
  beforeEach(() => {
    vi.mocked(httpRequest).mockClear();
  });

  it('reaches the withdrawals request once per Earn chain', async () => {
    // prod, because Earn is configured for mainnet only and every other
    // environment short-circuits to a failure per chain before any request.
    await getEarnWithdrawalsAllChains({
      account: ACCOUNT,
      env: Env.prod,
      auth,
    });

    expect(httpRequest).toHaveBeenCalledTimes(EARN_CHAINS.length);
    for (const call of vi.mocked(httpRequest).mock.calls) {
      expect(call[0]).toMatchObject({ auth, scope: 'userScoped' });
    }
  });

  it('reaches the deposits request once per Earn chain', async () => {
    await getEarnDepositsAllChains({
      account: ACCOUNT,
      env: Env.prod,
      auth,
    });

    expect(httpRequest).toHaveBeenCalledTimes(EARN_CHAINS.length);
    for (const call of vi.mocked(httpRequest).mock.calls) {
      expect(call[0]).toMatchObject({ auth, scope: 'userScoped' });
    }
  });

  it('sends the request as user-scoped even with no provider', async () => {
    // Without `auth` the scope still has to be `userScoped`: that is what makes
    // the HTTP layer refuse before sending rather than send anonymously and
    // collect a 401 from the gateway.
    await getEarnWithdrawalsAllChains({ account: ACCOUNT, env: Env.prod });

    expect(httpRequest).toHaveBeenCalledTimes(EARN_CHAINS.length);
    for (const call of vi.mocked(httpRequest).mock.calls) {
      expect(call[0]).toMatchObject({ scope: 'userScoped' });
      expect((call[0] as { auth?: unknown }).auth).toBeUndefined();
    }
  });
});
