import { describe, expect, it } from 'vitest';

import { isWalletAuthTokenValid } from '../../../api-functions/walletAuth/tokenValidity';

function makeJwt(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${body}.signature`;
}

const nowSec = () => Math.floor(Date.now() / 1000);

describe('isWalletAuthTokenValid', () => {
  it('returns true for a token expiring comfortably in the future', () => {
    expect(isWalletAuthTokenValid(makeJwt({ exp: nowSec() + 3600 }))).toBe(true);
  });

  it('returns false for an expired token', () => {
    expect(isWalletAuthTokenValid(makeJwt({ exp: nowSec() - 10 }))).toBe(false);
  });

  it('treats a token within the skew window as expired', () => {
    expect(
      isWalletAuthTokenValid(makeJwt({ exp: nowSec() + 10 }), {
        skewSeconds: 30,
      }),
    ).toBe(false);
  });

  it('honors a custom skew of 0', () => {
    expect(
      isWalletAuthTokenValid(makeJwt({ exp: nowSec() + 10 }), {
        skewSeconds: 0,
      }),
    ).toBe(true);
  });

  it('returns false when there is no exp claim', () => {
    expect(isWalletAuthTokenValid(makeJwt({ sub: 'x' }))).toBe(false);
  });

  it('returns false for a malformed token', () => {
    expect(isWalletAuthTokenValid('not-a-jwt')).toBe(false);
    expect(isWalletAuthTokenValid('')).toBe(false);
  });
});
