import type {
  WalletAuthChain,
  WalletChallengeResponse,
} from '@lombard.finance/sdk-common';

import { getApiConfig } from '../../common/api-config';
import { getHttpClient } from '../../common/http-client';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';

interface WalletChallengeApiResponse {
  nonce: string;
  payload: string;
  expires_at: string;
}

export interface RequestWalletChallengeParams extends IEnvParam {
  address: string;
  chain: WalletAuthChain;
}

/**
 * Request a wallet challenge payload.
 *
 * POST /v2/auth/wallet/challenge
 */
export async function requestWalletChallenge({
  address,
  chain,
  env,
}: RequestWalletChallengeParams): Promise<WalletChallengeResponse> {
  const { v2ApiUrl } = getApiConfig(env);

  try {
    const { data } = await getHttpClient(env).post<WalletChallengeApiResponse>(
      'v2/auth/wallet/challenge',
      { address, chain },
      { baseURL: v2ApiUrl },
    );

    return {
      nonce: data.nonce,
      payload: data.payload,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
