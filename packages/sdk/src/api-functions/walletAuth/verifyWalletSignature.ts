import type {
  WalletAuthChain,
  WalletChallengeType,
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
  /** Present (non-empty) for synchronous verification. */
  jwt: string;
  /** Present (non-empty) for synchronous verification. */
  expires_at: string;
  /** Present (non-empty) for asynchronous verification — poll on this. */
  verification_id: string;
  /** VERIFICATION_STATUS_SYNC_COMPLETE | VERIFICATION_STATUS_PENDING. */
  status: string;
}

export interface VerifyWalletSignatureParams extends IEnvParam {
  address: string;
  payload: string;
  signature: string;
  chain: WalletAuthChain;
  /** Required for chains that don't expose pubkey in the signature (Starknet, Cosmos). */
  publicKey?: string;
  /**
   * Must repeat the `challengeType` the challenge was requested with.
   * Challenges are stored per address *and* type, so omitting it here looks up
   * a plain-text challenge that was never issued.
   */
  challengeType?: WalletChallengeType;
}

/**
 * Verify a signed wallet challenge.
 *
 * POST /v2/auth/wallet/verify
 *
 * Sync path (EVM EOA / Sui / Solana): a JWT is issued immediately and returned
 * as a `complete` result. Async path (EVM smart-contract wallets / Starknet):
 * the signature is verified on-chain, so a `verificationId` is returned as a
 * `pending` result — poll it with `pollWalletVerification`.
 *
 * For a typed-data challenge (`permit`, `feeApproval`) the server also records
 * the signed authorisation on success, so no separate call is needed to store
 * it.
 */
export async function verifyWalletSignature({
  address,
  payload,
  signature,
  chain,
  publicKey,
  challengeType,
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
        ...(challengeType ? { challenge_type: challengeType } : {}),
      },
      {
        baseURL: baseApiV2Url,
        timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
      },
    );

    // Sync path: the JWT is issued immediately.
    if (data.jwt) {
      return {
        kind: 'complete',
        jwt: data.jwt,
        expiresAt: data.expires_at,
      };
    }

    // Async path: a `verification_id` is returned to poll on.
    if (data.verification_id) {
      return { kind: 'pending', verificationId: data.verification_id };
    }

    throw new Error(
      'Wallet verification returned neither a token nor a verification id',
    );
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
