import { getApiConfig } from '../../common/api-config';
import {
  getStoredAuthToken,
  setStoredAuthToken,
} from '../../common/auth-token';
import { getHttpClient } from '../../common/http-client';
import { IEnvParam } from '../../common/parameters';

export interface RevokeWalletTokenParams extends IEnvParam {
  /** JWT to invalidate server-side. */
  jwt: string;
}

/**
 * Revoke a wallet JWT server-side.
 *
 * POST /v2/auth/token/revoke (Authorization: Bearer <jwt>)
 *
 * Best-effort: network/server errors are swallowed so callers can always
 * clear local state after a disconnect.
 */
export async function revokeWalletToken({
  jwt,
  env,
}: RevokeWalletTokenParams): Promise<void> {
  if (!jwt) return;

  const { baseApiUrl } = getApiConfig(env);

  // Drop any SDK-held copy of this token so later requests stop sending it.
  if (getStoredAuthToken(env) === jwt) {
    setStoredAuthToken(env, undefined);
  }

  try {
    await getHttpClient(env).post(
      'v2/auth/token/revoke',
      {},
      {
        baseURL: baseApiUrl,
        // Explicit header revokes this specific JWT regardless of what the
        // interceptor would otherwise attach.
        headers: { Authorization: `Bearer ${jwt}` },
      },
    );
  } catch (error) {
    // Best-effort revoke; do not surface to callers.
    console.error('Failed to revoke wallet JWT:', error);
  }
}
