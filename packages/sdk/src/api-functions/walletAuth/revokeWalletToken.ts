import axios from 'axios';

import {
  getApiConfig,
  WALLET_AUTH_REQUEST_TIMEOUT_MS,
} from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';

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
        timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
      },
    );
  } catch (error) {
    // Best-effort revoke; do not surface to callers.
    //
    // The message only, never the error object: on an axios rejection that
    // carries the request config, and the config carries the
    // `Authorization: Bearer <jwt>` header set above. This branch runs exactly
    // when revocation failed, so the token is still live, and a consumer whose
    // reporter serialises error properties would ship it off the machine.
    console.error(`Failed to revoke wallet JWT: ${getErrorMessage(error)}`);
  }
}
