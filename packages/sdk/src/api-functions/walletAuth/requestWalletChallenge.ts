import type {
  FeeApprovalChallengeParams,
  PermitChallengeParams,
  WalletAuthChain,
  WalletChallengeResponse,
  WalletChallengeType,
} from '@lombard.finance/sdk-common';
import { WALLET_CHALLENGE_TYPE } from '@lombard.finance/sdk-common';

import {
  getApiConfig,
  WALLET_AUTH_REQUEST_TIMEOUT_MS,
} from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';
import { httpPost } from '../../utils/http';

interface WalletChallengeApiResponse {
  nonce: string;
  payload: string;
  expires_at: string;
  challenge_type?: string;
  digest?: string;
  signature_expires_at?: string | null;
}

export interface RequestWalletChallengeParams extends IEnvParam {
  address: string;
  chain: WalletAuthChain;
  /** Defaults to the plain-text terms-of-service challenge. */
  challengeType?: WalletChallengeType;
  /** Required when `challengeType` is `permit`. */
  permit?: PermitChallengeParams;
  /** Required when `challengeType` is `feeApproval`. */
  feeApproval?: FeeApprovalChallengeParams;
}

/**
 * Request a wallet challenge payload.
 *
 * With no `challengeType` the server issues a plain-text terms-of-service
 * message for `personal_sign`. With `permit` or `feeApproval` it issues EIP-712
 * typed data instead, so that one signature both proves control of the address
 * and authorises the on-chain action.
 *
 * The typed data is assembled server-side — it reads `nonces(owner)` from the
 * token and picks the deadline — so `permit.deadline` and `feeApproval.expiry`
 * are requests rather than instructions. What the server settled on comes back
 * as `signatureExpiresAt`.
 *
 * POST /v2/auth/wallet/challenge
 *
 * @throws if the params required by the requested `challengeType` are missing.
 */
export async function requestWalletChallenge({
  address,
  chain,
  challengeType,
  permit,
  feeApproval,
  env,
}: RequestWalletChallengeParams): Promise<WalletChallengeResponse> {
  const { baseApiV2Url } = getApiConfig(env);

  // Checked here rather than left to the gateway: a typed-data challenge whose
  // params are missing is not rejected, it falls back to the plain-text
  // payload, and the mismatch only surfaces later as a signature the server
  // refuses. Failing at the call site names the actual mistake.
  if (challengeType === WALLET_CHALLENGE_TYPE.permit && !permit) {
    throw new Error('A permit challenge requires `permit` params');
  }
  if (challengeType === WALLET_CHALLENGE_TYPE.feeApproval && !feeApproval) {
    throw new Error('A fee-approval challenge requires `feeApproval` params');
  }

  try {
    const { data } = await httpPost<WalletChallengeApiResponse>(
      'v2/auth/wallet/challenge',
      {
        address,
        chain,
        ...(challengeType ? { challenge_type: challengeType } : {}),
        ...(challengeType === WALLET_CHALLENGE_TYPE.permit && permit
          ? { permit: { value: permit.value, deadline: permit.deadline } }
          : {}),
        ...(challengeType === WALLET_CHALLENGE_TYPE.feeApproval && feeApproval
          ? {
              fee_approval: {
                max_mint_fee: feeApproval.maxMintFee,
                expiry: feeApproval.expiry,
              },
            }
          : {}),
      },
      {
        baseURL: baseApiV2Url,
        timeout: WALLET_AUTH_REQUEST_TIMEOUT_MS,
      },
    );

    return {
      nonce: data.nonce,
      payload: data.payload,
      expiresAt: data.expires_at,
      ...(data.challenge_type
        ? { challengeType: data.challenge_type as WalletChallengeType }
        : {}),
      ...(data.digest ? { digest: data.digest } : {}),
      ...(data.signature_expires_at
        ? { signatureExpiresAt: data.signature_expires_at }
        : {}),
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
