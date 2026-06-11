/**
 * Wallet JWT validity helper
 *
 * Pure, client-side liveness check for a wallet-auth JWT. Reads the `exp`
 * claim from the token without verifying its signature (the backend does that)
 * — enough to decide whether to reuse a stored token or re-authenticate.
 *
 * @module api-functions/walletAuth/tokenValidity
 */

function base64UrlDecode(input: string): string {
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=');

  if (typeof atob === 'function') {
    return atob(base64);
  }
  // Node fallback
  return Buffer.from(base64, 'base64').toString('binary');
}

export interface IsWalletAuthTokenValidOptions {
  /**
   * Treat the token as expired this many seconds early, so it isn't sent
   * moments before the backend would reject it.
   * @default 30
   */
  skewSeconds?: number;
}

/**
 * Returns true if the JWT's `exp` claim is still in the future (minus skew).
 * Returns false for malformed tokens or tokens without an `exp` claim.
 */
export function isWalletAuthTokenValid(
  jwt: string,
  options: IsWalletAuthTokenValidOptions = {},
): boolean {
  const { skewSeconds = 30 } = options;
  try {
    const payloadPart = jwt.split('.')[1];
    if (!payloadPart) return false;
    const { exp } = JSON.parse(base64UrlDecode(payloadPart)) as {
      exp?: number;
    };
    if (typeof exp !== 'number') return false;
    return exp - skewSeconds > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
