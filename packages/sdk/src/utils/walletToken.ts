/**
 * Reading the wallet token the host hands the SDK, to choose a route.
 *
 * Nothing here checks a signature or trusts a claim for access: the gateway
 * does that. These only decide which of two routes a call takes.
 *
 * @module utils/walletToken
 */

import {
  type HttpRequestOptions,
  resolveAuthToken,
  reuseResolvedToken,
} from './http';

type AuthOptions = Pick<HttpRequestOptions, 'auth' | 'getAuthToken'>;

/**
 * The wallet a wallet-auth JWT was issued to: its `sub` claim.
 *
 * `undefined` when the token is not a JWT, its payload is not base64url JSON,
 * or the payload carries no `sub`.
 */
export function walletTokenSubject(token: string): string | undefined {
  const payload = token.split('.')[1];
  if (!payload) return undefined;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const json = new TextDecoder().decode(
      Uint8Array.from(binary, (char) => char.charCodeAt(0)),
    );
    const sub = (JSON.parse(json) as { sub?: unknown } | null)?.sub;
    return typeof sub === 'string' && sub ? sub : undefined;
  } catch {
    return undefined;
  }
}

/** An address in the one spelling {@link isSameWalletAddress} compares. */
function normaliseAddress(address: string): string {
  const lower = address.trim().toLowerCase();
  if (!lower.startsWith('0x')) return lower;
  // Starknet addresses are written both padded to 64 hex digits and not.
  return `0x${lower.slice(2).replace(/^0+/, '')}`;
}

/**
 * Whether two addresses name the same wallet: regardless of letter case, and
 * for a `0x` address regardless of leading zeros.
 */
export function isSameWalletAddress(a: string, b: string): boolean {
  return normaliseAddress(a) === normaliseAddress(b);
}

/**
 * Whether `token` can be sent to a route scoped to `address`.
 *
 * False only when the token names another wallet, which such a route refuses
 * with 403. A token whose wallet cannot be read is sent, and the route
 * decides.
 */
export function walletTokenMayActFor(token: string, address: string): boolean {
  const subject = walletTokenSubject(token);
  return subject === undefined || isSameWalletAddress(subject, address);
}

/**
 * The `auth` options for a call to the v2 route at `url`, which is scoped to
 * `address`, or `undefined` when the call takes its v1 route instead.
 *
 * v1 is taken when there is no token, and when the token is for another
 * wallet: a host signed in as one wallet can act for a recipient that is not
 * it, or hold a token from before a wallet switch, and the v2 route refuses
 * both while v1 needs no token. That is the route chosen up front; once a v2
 * request is sent, its failures are the caller's and never retried on v1.
 *
 * The token resolved to decide is the one the request sends first, so the
 * host is asked once.
 */
export async function v2RouteAuth(
  options: AuthOptions,
  url: string,
  address: string,
): Promise<AuthOptions | undefined> {
  const token = await resolveAuthToken(options, { url, scope: 'userScoped' });
  if (!token || !walletTokenMayActFor(token, address)) return undefined;
  return reuseResolvedToken(options, token);
}
