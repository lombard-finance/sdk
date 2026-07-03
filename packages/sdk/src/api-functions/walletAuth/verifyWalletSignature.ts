import type {
  WalletAuthChain,
  WalletVerifyResponse,
} from '@lombard.finance/sdk-common';
import axios from 'axios';

import {
  getApiConfig,
  WALLET_AUTH_REQUEST_TIMEOUT_MS,
} from '../../common/api-config';
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
  env,
}: VerifyWalletSignatureParams): Promise<WalletVerifyResponse> {
  const { baseApiV2Url } = getApiConfig(env);

  try {
    const { data } = await axios.post<WalletVerifyApiResponse>(
      'v2/auth/wallet/verify',
      {
        address,
        payload,
        signature,
        chain,
        ...(publicKey ? { public_key: publicKey } : {}),
      },
      {
        baseURL: baseApiV2Url,
        timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
      },
    );

    return {
      jwt: data.jwt,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
