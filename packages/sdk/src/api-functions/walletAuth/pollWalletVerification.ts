import {
  VERIFICATION_STATUS,
  type WalletVerifyResult,
} from '@lombard.finance/sdk-common';

import {
  getApiConfig,
  WALLET_AUTH_REQUEST_TIMEOUT_MS,
} from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';
import { httpPost } from '../../utils/http';

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
// (Starknet) or longer. The gateway rate-limits `/v2/auth/*` per source IP,
// and a sign-in has already spent two of those requests (challenge and
// verify) before it polls. A fixed 2 s interval sent thirty polls a minute,
// so the poll backs off instead: 3 s, 6 s, 10 s, then every 15 s. That is six
// polls in the first minute, eight requests with the challenge and verify, and
// ten polls over the whole budget.
const POLL_BACKOFF_MS = [3_000, 6_000, 10_000];
const POLL_MAX_INTERVAL_MS = 15_000;
const POLL_MAX_DURATION_MS = 120_000;

/** The wait before poll `attempt + 1`, `attempt` counting from zero. */
function pollDelayMs(attempt: number): number {
  return POLL_BACKOFF_MS[attempt] ?? POLL_MAX_INTERVAL_MS;
}

/**
 * How long a rate-limited poll asks to wait, from `Retry-After` in seconds, or
 * `undefined` when the failure is not a rate limit. A 429 here means the
 * shared per-IP budget is spent, not that verification failed, so the poll
 * waits and asks again rather than failing a sign-in that may still complete.
 */
function rateLimitWaitMs(error: unknown): number | undefined {
  const response = (
    error as {
      response?: { status?: number; headers?: Record<string, unknown> };
    }
  )?.response;
  if (response?.status !== 429) return undefined;
  const seconds = Number(response.headers?.['retry-after']);
  return Number.isFinite(seconds) && seconds > 0
    ? seconds * 1_000
    : POLL_MAX_INTERVAL_MS;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export interface PollWalletVerificationParams extends IEnvParam {
  verificationId: string;
  /** Optional client secret returned by the wallet challenge. */
  clientSecret?: string;
}

/**
 * Poll the async wallet-verification endpoint until the signature is verified
 * on-chain and a JWT is issued.
 *
 * Always `POST /v2/auth/wallet/verify/{verification_id}/status`, with the
 * client secret in the body when the challenge issued one. The gateway also
 * binds the same call to `GET /v2/auth/wallet/verify/{verification_id}`, but
 * that binding is deprecated and goes once client secrets are required, so it
 * is not used even when there is no secret to send.
 *
 * Resolves with the token pair on `VERIFICATION_STATUS_COMPLETE_VALID`, and
 * throws if verification fails, returns an unexpected terminal status, or the
 * overall polling budget is exhausted.
 */
export async function pollWalletVerification({
  verificationId,
  clientSecret,
  env,
}: PollWalletVerificationParams): Promise<WalletVerifyResult> {
  const { baseApiV2Url } = getApiConfig(env);
  const url = `v2/auth/wallet/verify/${verificationId}`;
  const deadline = Date.now() + POLL_MAX_DURATION_MS;

  try {
    for (let attempt = 0; Date.now() < deadline; attempt += 1) {
      const config = {
        baseURL: baseApiV2Url,
        timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
      };
      let data: WalletVerificationStatusApiResponse;
      try {
        ({ data } = await httpPost<WalletVerificationStatusApiResponse>(
          `${url}/status`,
          clientSecret ? { client_secret: clientSecret } : {},
          config,
        ));
      } catch (error) {
        const waitMs = rateLimitWaitMs(error);
        if (waitMs === undefined) throw error;
        await delay(Math.min(waitMs, Math.max(0, deadline - Date.now())));
        continue;
      }

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

      await delay(pollDelayMs(attempt));
    }

    throw new Error('Wallet verification timed out');
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
