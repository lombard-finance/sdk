import type {
  WalletAuthChain,
  WalletVerifyResponse,
} from '@lombard.finance/sdk-common';

import { getApiConfig } from '../../common/api-config';
import { setStoredAuthToken } from '../../common/auth-token';
import { getHttpClient } from '../../common/http-client';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';

interface WalletVerifyApiResponse {
  jwt: string;
  expires_at: string;
}

export interface VerifyWalletSignatureParams extends IEnvParam {
  address: string;
  payload: string;
  signature: string;
  chain: WalletAuthChain;
  /** Required for chains that don't expose pubkey in the signature (Starknet, Cosmos). */
  publicKey?: string;
  /** When true, store the issued JWT in the SDK so it is attached to later requests. */
  persist?: boolean;
}

/**
 * Verify a signed wallet challenge and obtain a JWT.
 *
 * POST /v2/auth/wallet/verify
 */
export async function verifyWalletSignature({
  address,
  payload,
  signature,
  chain,
  publicKey,
  persist,
  env,
}: VerifyWalletSignatureParams): Promise<WalletVerifyResponse> {
  const { v2ApiUrl } = getApiConfig(env);

  try {
    const { data } = await getHttpClient(env).post<WalletVerifyApiResponse>(
      'v2/auth/wallet/verify',
      {
        address,
        payload,
        signature,
        chain,
        ...(publicKey ? { public_key: publicKey } : {}),
      },
      { baseURL: v2ApiUrl },
    );

    if (persist) {
      setStoredAuthToken(env, data.jwt);
    }

    return {
      jwt: data.jwt,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
