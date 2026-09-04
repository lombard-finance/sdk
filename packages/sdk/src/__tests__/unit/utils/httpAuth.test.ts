/**
 * The wallet-token transport
 *
 * `getAuthToken` was synchronous, so it could only hand back whatever the host
 * already held. At a seven-day token lifetime every long-lived session
 * eventually attaches an expired token and takes a 401 instead of refreshing —
 * the bug pattern observed app-side, where the hook scopes the token to the
 * address and never checks expiry.
 *
 * `auth.getToken()` is a promise so the host can decide to refresh. These pin
 * the three things that follow from that: scoping, refresh, and retrying once.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosFn = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({
  default: axiosFn,
  isAxiosError: (e: unknown) =>
    Boolean((e as { isAxiosError?: boolean })?.isAxiosError),
}));

const { httpRequest } = await import('../../../utils/http');
const { LombardError } = await import('../../../shared/errors');

/** A rejection shaped like the one axios raises. */
function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    response: { status, data: {} },
  });
}

const ok = { data: { ok: true }, status: 200, headers: {} };

function authHeaderOf(callIndex = 0): string | undefined {
  return axiosFn.mock.calls[callIndex]?.[0]?.headers?.Authorization;
}

beforeEach(() => {
  vi.clearAllMocks();
  axiosFn.mockResolvedValue(ok);
});

describe('scope: public', () => {
  it('attaches a token when one is available', async () => {
    await httpRequest({
      url: '/x',
      auth: { getToken: async () => 'tok' },
    });

    expect(authHeaderOf()).toBe('Bearer tok');
  });

  // The reason scoping exists at all: the SDK reads chain state before any
  // wallet is connected, so requiring a token everywhere would break first paint.
  it('sends anyway when no token is available', async () => {
    await httpRequest({
      url: '/x',
      auth: { getToken: async () => undefined },
    });

    expect(axiosFn).toHaveBeenCalledTimes(1);
    expect(authHeaderOf()).toBeUndefined();
  });

  it('is the default, so an unlabelled request never fails for want of a token', async () => {
    await expect(
      httpRequest({ url: '/x', auth: { getToken: async () => undefined } }),
    ).resolves.toMatchObject({ status: 200 });
  });
});

describe('scope: userScoped', () => {
  it('fails before sending when no token is available', async () => {
    await expect(
      httpRequest({
        url: '/positions',
        scope: 'userScoped',
        auth: { getToken: async () => undefined },
      }),
    ).rejects.toThrow(LombardError);

    // The point of failing locally: no round trip, and the caller gets a
    // precondition rather than a 401 to interpret.
    expect(axiosFn).not.toHaveBeenCalled();
  });

  it('names the config field that fixes it', async () => {
    await expect(
      httpRequest({
        url: '/positions',
        scope: 'userScoped',
        auth: { getToken: async () => undefined },
      }),
    ).rejects.toThrow(/auth/);
  });

  it('carries a machine-readable code', async () => {
    try {
      await httpRequest({
        url: '/positions',
        scope: 'userScoped',
        auth: { getToken: async () => undefined },
      });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as InstanceType<typeof LombardError>).code).toBe(
        'missing-token',
      );
    }
  });

  it('sends with the token when one is available', async () => {
    await httpRequest({
      url: '/positions',
      scope: 'userScoped',
      auth: { getToken: async () => 'tok' },
    });

    expect(authHeaderOf()).toBe('Bearer tok');
  });
});

describe('retrying a 401 once', () => {
  it('asks again and retries with the new token', async () => {
    axiosFn.mockRejectedValueOnce(httpError(401)).mockResolvedValueOnce(ok);
    const getToken = vi
      .fn()
      .mockResolvedValueOnce('stale')
      .mockResolvedValueOnce('fresh');

    const res = await httpRequest({
      url: '/positions',
      scope: 'userScoped',
      auth: { getToken },
    });

    expect(res.status).toBe(200);
    expect(axiosFn).toHaveBeenCalledTimes(2);
    expect(authHeaderOf(0)).toBe('Bearer stale');
    expect(authHeaderOf(1)).toBe('Bearer fresh');
  });

  // One retry, not a loop. A second rejection means the session is gone.
  it('gives up after the second rejection', async () => {
    axiosFn.mockRejectedValue(httpError(401));
    const onUnauthorized = vi.fn();

    await expect(
      httpRequest({
        url: '/positions',
        scope: 'userScoped',
        auth: {
          getToken: vi
            .fn()
            .mockResolvedValueOnce('stale')
            .mockResolvedValueOnce('fresh'),
          onUnauthorized,
        },
      }),
    ).rejects.toThrow(/no longer valid/);

    expect(axiosFn).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the host returns the same token', async () => {
    axiosFn.mockRejectedValue(httpError(401));
    const onUnauthorized = vi.fn();

    await expect(
      httpRequest({
        url: '/positions',
        scope: 'userScoped',
        auth: { getToken: async () => 'same', onUnauthorized },
      }),
    ).rejects.toThrow(/no new token was available/);

    // Re-sending an identical token would just fail again.
    expect(axiosFn).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not retry a public request', async () => {
    axiosFn.mockRejectedValue(httpError(401));

    await expect(
      httpRequest({ url: '/x', auth: { getToken: async () => 'tok' } }),
    ).rejects.toThrow();

    expect(axiosFn).toHaveBeenCalledTimes(1);
  });

  it('does not retry a non-401 failure', async () => {
    axiosFn.mockRejectedValue(httpError(500));

    await expect(
      httpRequest({
        url: '/positions',
        scope: 'userScoped',
        auth: { getToken: async () => 'tok' },
      }),
    ).rejects.toThrow();

    expect(axiosFn).toHaveBeenCalledTimes(1);
  });
});

describe('what still works unchanged', () => {
  it('an explicit Authorization header wins and is never refreshed', async () => {
    axiosFn.mockRejectedValueOnce(httpError(401)).mockResolvedValueOnce(ok);
    const getToken = vi.fn().mockResolvedValue('provider-token');

    await expect(
      httpRequest({
        url: '/v2/auth/token/revoke',
        scope: 'userScoped',
        headers: { Authorization: 'Bearer the-one-being-revoked' },
        auth: { getToken },
      }),
    ).rejects.toThrow();

    // revokeWalletToken sends the token it is invalidating. Refreshing it would
    // revoke the wrong one, so the provider is not consulted at all.
    expect(getToken).not.toHaveBeenCalled();
    expect(authHeaderOf(0)).toBe('Bearer the-one-being-revoked');
  });

  it('honours the deprecated synchronous accessor when auth is absent', async () => {
    await httpRequest({ url: '/x', getAuthToken: () => 'legacy' });

    expect(authHeaderOf()).toBe('Bearer legacy');
  });

  it('prefers auth over the deprecated accessor', async () => {
    await httpRequest({
      url: '/x',
      getAuthToken: () => 'legacy',
      auth: { getToken: async () => 'modern' },
    });

    expect(authHeaderOf()).toBe('Bearer modern');
  });

  it('sends no header when neither is configured', async () => {
    await httpRequest({ url: '/x' });

    expect(authHeaderOf()).toBeUndefined();
  });

  it('passes the url and scope to the provider, so it can decide per request', async () => {
    const getToken = vi.fn().mockResolvedValue('tok');

    await httpRequest({
      url: '/positions',
      baseURL: 'https://api.example',
      scope: 'userScoped',
      auth: { getToken },
    });

    expect(getToken).toHaveBeenCalledWith({
      url: 'https://api.example/positions',
      scope: 'userScoped',
    });
  });
});
