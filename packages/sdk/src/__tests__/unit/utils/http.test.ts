/**
 * `utils/http.ts` is publicly exported from two entry points and had no tests.
 *
 * It is about to matter a great deal more: stage A3 routes every api-function
 * through it, which makes it the single place a wallet-auth token is attached.
 * A chokepoint with no tests is worse than no chokepoint, so it gets them first.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosFn = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: () => false }));

import {
  getSdkHeaders,
  httpGet,
  httpPost,
  httpRequest,
} from '../../../utils/http';

function sentHeaders(): Record<string, string> {
  return axiosFn.mock.calls[0][0].headers as Record<string, string>;
}

describe('httpRequest', () => {
  beforeEach(() => {
    axiosFn.mockReset();
    axiosFn.mockResolvedValue({ data: { ok: true }, status: 200, headers: {} });
  });

  it('always sends the SDK version headers', async () => {
    await httpRequest({ url: '/thing' });
    for (const [k, v] of Object.entries(getSdkHeaders())) {
      expect(sentHeaders()[k]).toBe(v);
    }
  });

  it('sends no Authorization header when no accessor is given', async () => {
    await httpRequest({ url: '/thing' });
    expect(sentHeaders().Authorization).toBeUndefined();
  });

  it('sends no Authorization header when the accessor yields undefined', async () => {
    await httpRequest({ url: '/thing', getAuthToken: () => undefined });
    expect(sentHeaders().Authorization).toBeUndefined();
  });

  it('attaches Bearer <token> when the accessor yields one', async () => {
    await httpRequest({ url: '/thing', getAuthToken: () => 'abc123' });
    expect(sentHeaders().Authorization).toBe('Bearer abc123');
  });

  it('reads the accessor at call time, not at construction', async () => {
    const store: { jwt?: string } = {};
    const options = { url: '/thing', getAuthToken: () => store.jwt };

    await httpRequest(options);
    expect(sentHeaders().Authorization).toBeUndefined();

    axiosFn.mockClear();
    store.jwt = 'later';
    await httpRequest(options);
    expect(sentHeaders().Authorization).toBe('Bearer later');
  });

  it('lets an explicit Authorization header win over the accessor', async () => {
    // revokeWalletToken already holds the token it wants to invalidate and
    // passes it directly. That must keep working.
    await httpRequest({
      url: '/thing',
      getAuthToken: () => 'from-accessor',
      headers: { Authorization: 'Bearer explicit' },
    });
    expect(sentHeaders().Authorization).toBe('Bearer explicit');
  });

  it('returns the payload, status and a duration', async () => {
    const res = await httpRequest<{ ok: boolean }>({ url: '/thing' });
    expect(res.data).toEqual({ ok: true });
    expect(res.status).toBe(200);
    expect(typeof res.duration).toBe('number');
  });

  it('passes method, params and body through', async () => {
    await httpRequest({
      url: '/thing',
      method: 'POST',
      params: { a: 1 },
      body: { b: 2 },
      baseURL: 'https://example.test',
    });
    const cfg = axiosFn.mock.calls[0][0];
    expect(cfg.method).toBe('POST');
    expect(cfg.params).toEqual({ a: 1 });
    expect(cfg.data).toEqual({ b: 2 });
    expect(cfg.baseURL).toBe('https://example.test');
  });

  it('httpGet and httpPost forward the accessor', async () => {
    await httpGet('/g', { getAuthToken: () => 'tok' });
    expect(sentHeaders().Authorization).toBe('Bearer tok');

    axiosFn.mockClear();
    await httpPost('/p', { x: 1 }, { getAuthToken: () => 'tok' });
    expect(sentHeaders().Authorization).toBe('Bearer tok');
    expect(axiosFn.mock.calls[0][0].data).toEqual({ x: 1 });
  });
});
