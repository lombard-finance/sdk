/**
 * Reading whose wallet a token is, to choose between a v2 route scoped to an
 * address and its v1 counterpart. Nothing here grants access: a token read as
 * the right wallet is still checked by the gateway.
 */
import type { LombardAuth } from '@lombard.finance/sdk-common';
import { describe, expect, it, vi } from 'vitest';

import {
  isSameWalletAddress,
  v2RouteAuth,
  walletTokenMayActFor,
  walletTokenSubject,
} from '../../../utils/walletToken';

const ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const OTHER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

function jwt(payload: unknown): string {
  const part = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'ES256', typ: 'JWT' })}.${part(payload)}.c2ln`;
}

describe('walletTokenSubject', () => {
  it('reads the sub claim', () => {
    expect(walletTokenSubject(jwt({ sub: ACCOUNT }))).toBe(ACCOUNT);
  });

  // base64url uses `-` and `_` and drops the padding; a payload that needs
  // all three is read the same as any other.
  it('reads a payload that is base64url rather than base64', () => {
    const payload = { sub: ACCOUNT, note: '??>>~~' };
    const token = jwt(payload);
    expect(token.split('.')[1]).toMatch(/[-_]/);
    expect(token.split('.')[1]).not.toContain('=');

    expect(walletTokenSubject(token)).toBe(ACCOUNT);
  });

  it('reads a payload with text outside ASCII', () => {
    expect(walletTokenSubject(jwt({ sub: ACCOUNT, name: 'Zoë ₿' }))).toBe(
      ACCOUNT,
    );
  });

  it.each([
    ['an opaque token', 'wallet-jwt'],
    ['an empty string', ''],
    ['a payload that is not base64', 'a.!!!.c'],
    [
      'a payload that is not JSON',
      `a.${Buffer.from('nope').toString('base64url')}.c`,
    ],
    ['a payload that is JSON null', jwt(null)],
    ['no sub', jwt({ exp: 1 })],
    ['an empty sub', jwt({ sub: '' })],
    ['a sub that is not a string', jwt({ sub: 42 })],
  ])('is undefined for %s', (_label, token) => {
    expect(walletTokenSubject(token)).toBeUndefined();
  });
});

describe('isSameWalletAddress', () => {
  it('ignores letter case', () => {
    expect(isSameWalletAddress(ACCOUNT, ACCOUNT.toLowerCase())).toBe(true);
    expect(isSameWalletAddress(ACCOUNT, ACCOUNT.toUpperCase())).toBe(true);
  });

  it('tells two wallets apart', () => {
    expect(isSameWalletAddress(ACCOUNT, OTHER)).toBe(false);
  });

  // Starknet addresses are written both padded to 64 hex digits and not.
  it('ignores leading zeros on a 0x address', () => {
    expect(
      isSameWalletAddress(
        '0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4',
        '0x36834A40984312F7F7DE8D31E3F6305B325389EAEEA5B1C0664B2FB936461A4',
      ),
    ).toBe(true);
  });

  it('keeps zeros that are not leading', () => {
    expect(isSameWalletAddress('0x10', '0x1')).toBe(false);
  });
});

describe('walletTokenMayActFor', () => {
  it('is true for a token for the address', () => {
    expect(walletTokenMayActFor(jwt({ sub: ACCOUNT }), ACCOUNT)).toBe(true);
  });

  it('is false for a token for another wallet', () => {
    expect(walletTokenMayActFor(jwt({ sub: OTHER }), ACCOUNT)).toBe(false);
  });

  it('is true for a token whose wallet cannot be read', () => {
    expect(walletTokenMayActFor('wallet-jwt', ACCOUNT)).toBe(true);
    expect(walletTokenMayActFor(jwt({}), ACCOUNT)).toBe(true);
  });
});

describe('v2RouteAuth', () => {
  const url = `https://example.test/v2/x/${ACCOUNT}`;

  it('asks the host with the route and a user scope', async () => {
    const getToken = vi.fn(async () => jwt({ sub: ACCOUNT }));

    await v2RouteAuth({ auth: { getToken } }, url, ACCOUNT);

    expect(getToken).toHaveBeenCalledWith({ url, scope: 'userScoped' });
  });

  it('is undefined with no token or a token for another wallet', async () => {
    await expect(
      v2RouteAuth({ auth: { getToken: async () => undefined } }, url, ACCOUNT),
    ).resolves.toBeUndefined();
    await expect(
      v2RouteAuth(
        { auth: { getToken: async () => jwt({ sub: OTHER }) } },
        url,
        ACCOUNT,
      ),
    ).resolves.toBeUndefined();
  });

  // The request asks for the token before sending; that first ask is answered
  // with the token already resolved, and only a later one, the retry after a
  // 401, reaches the host again.
  it('answers the first ask with the resolved token, later ones from the host', async () => {
    const own = jwt({ sub: ACCOUNT });
    const fresh = jwt({ sub: ACCOUNT, n: 2 });
    const getToken = vi
      .fn<LombardAuth['getToken']>()
      .mockResolvedValueOnce(own)
      .mockResolvedValueOnce(fresh);
    const context = { url, scope: 'userScoped' as const };

    const result = await v2RouteAuth({ auth: { getToken } }, url, ACCOUNT);

    await expect(result?.auth?.getToken(context)).resolves.toBe(own);
    expect(getToken).toHaveBeenCalledTimes(1);
    await expect(result?.auth?.getToken(context)).resolves.toBe(fresh);
    expect(getToken).toHaveBeenCalledTimes(2);
  });

  it("passes onUnauthorized through to the host's auth", async () => {
    const host = {
      calls: 0,
      getToken: async () => jwt({ sub: ACCOUNT }),
      onUnauthorized() {
        this.calls += 1;
      },
    };

    const result = await v2RouteAuth({ auth: host }, url, ACCOUNT);
    result?.auth?.onUnauthorized?.({ url, scope: 'userScoped' });

    expect(host.calls).toBe(1);
  });

  it('reuses a token from the deprecated reader without calling it again', async () => {
    const getAuthToken = vi.fn(() => jwt({ sub: ACCOUNT }));

    const result = await v2RouteAuth({ getAuthToken }, url, ACCOUNT);

    expect(result?.auth).toBeUndefined();
    expect(result?.getAuthToken?.()).toBe(getAuthToken.mock.results[0]?.value);
    expect(getAuthToken).toHaveBeenCalledTimes(1);
  });
});
