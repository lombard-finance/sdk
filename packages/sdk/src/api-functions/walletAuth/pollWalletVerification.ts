import {
  VERIFICATION_STATUS,
  type WalletVerifyResult,
} from '@lombard.finance/sdk-common';
import axios from 'axios';

import {
  getApiConfig,
  WALLET_AUTH_REQUEST_TIMEOUT_MS,
} from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';

interface WalletVerificationStatusApiResponse {
  /** e.g. VERIFICATION_STATUS_PENDING | VERIFICATION_STATUS_COMPLETE_VALID. */
  status: string;
  /** Present (non-empty) once the status reaches a successful terminal state. */
  jwt: string;
  expires_at: string;
  /** Non-empty when verification failed. */
  error_code: string;
}

// Async verification is settled on-chain, so it can take several seconds
// (Starknet) or longer. Poll on a fixed interval up to an overall budget.
const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_DURATION_MS = 120_000;

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

export interface PollWalletVerificationParams extends IEnvParam {
  verificationId: string;
}

/**
 * Poll the async wallet-verification endpoint until the signature is verified
 * on-chain and a JWT is issued.
 *
 * GET /v2/auth/wallet/verify/{verification_id}
 *
 * Resolves with the token pair on `VERIFICATION_STATUS_COMPLETE_VALID`, and
 * throws if verification fails, returns an unexpected terminal status, or the
 * overall polling budget is exhausted.
 */
export async function pollWalletVerification({
  verificationId,
  env,
}: PollWalletVerificationParams): Promise<WalletVerifyResult> {
  const { baseApiV2Url } = getApiConfig(env);
  const url = `v2/auth/wallet/verify/${verificationId}`;
  const deadline = Date.now() + POLL_MAX_DURATION_MS;

  try {
    while (Date.now() < deadline) {
      const { data } = await axios.get<WalletVerificationStatusApiResponse>(
        url,
        {
          baseURL: baseApiV2Url,
          timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
        },
      );

      if (data.status === VERIFICATION_STATUS.completeValid) {
        if (!data.jwt) {
          throw new Error('Wallet verification completed without a token');
        }
        return { jwt: data.jwt, expiresAt: data.expires_at };
      }

      // Anything other than "still pending" is a terminal failure.
      if (data.status !== VERIFICATION_STATUS.pending) {
        throw new Error(
          data.error_code
            ? `Wallet verification failed: ${data.error_code}`
            : `Wallet verification failed with status ${data.status}`,
        );
      }

      await delay(POLL_INTERVAL_MS);
    }

    throw new Error('Wallet verification timed out');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
