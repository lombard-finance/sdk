import axios from 'axios';

import { getApiConfig } from '../../common/api-config';
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

  const { baseApiV2Url } = getApiConfig(env);

  try {
    await axios.post(
      'v2/auth/token/revoke',
      {},
      {
        baseURL: baseApiV2Url,
        headers: { Authorization: `Bearer ${jwt}` },
      },
    );
  } catch (error) {
    // Best-effort revoke; do not surface to callers.
    // eslint-disable-next-line no-console
    console.error('Failed to revoke wallet JWT:', error);
  }
}
