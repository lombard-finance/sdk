import type {
  WalletAuthChain,
  WalletChallengeResponse,
} from '@lombard.finance/sdk-common';
import axios from 'axios';

import { getApiConfig } from '../../common/api-config';
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
  const { baseApiV2Url } = getApiConfig(env);

  try {
    const { data } = await axios.post<WalletChallengeApiResponse>(
      'v2/auth/wallet/challenge',
      { address, chain },
      { baseURL: baseApiV2Url },
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
