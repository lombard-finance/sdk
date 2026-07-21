/**
 * Wallet Auth Service
 *
 * Implementation of the WalletAuthService interface from sdk-common.
 * Thin wrapper around the v2 wallet-auth HTTP endpoints.
 *
 * @module services/WalletAuthService
 */

import type { Env } from '@lombard.finance/sdk-common';
import type {
  PollWalletVerificationRequest,
  RevokeWalletTokenRequest,
  WalletAuthService as IWalletAuthService,
  WalletChallengeRequest,
  WalletChallengeResponse,
  WalletVerifyRequest,
  WalletVerifyResponse,
  WalletVerifyResult,
} from '@lombard.finance/sdk-common';

import { pollWalletVerification } from '../api-functions/walletAuth/pollWalletVerification';
import { requestWalletChallenge } from '../api-functions/walletAuth/requestWalletChallenge';
import { revokeWalletToken } from '../api-functions/walletAuth/revokeWalletToken';
import { verifyWalletSignature } from '../api-functions/walletAuth/verifyWalletSignature';

export class WalletAuthService implements IWalletAuthService {
  // `protected` so app-local subclasses (which add a `signIn` convenience
  // wrapping the challenge -> verify -> poll ceremony) can pass the env through
  // to the underlying api-functions.
  constructor(protected readonly env: Env) {}

  requestChallenge(
    params: WalletChallengeRequest,
  ): Promise<WalletChallengeResponse> {
    return requestWalletChallenge({ ...params, env: this.env });
  }

  verifySignature(params: WalletVerifyRequest): Promise<WalletVerifyResponse> {
    return verifyWalletSignature({ ...params, env: this.env });
  }

  pollVerification(
    params: PollWalletVerificationRequest,
  ): Promise<WalletVerifyResult> {
    return pollWalletVerification({ ...params, env: this.env });
  }

  revokeToken({ jwt }: RevokeWalletTokenRequest): Promise<void> {
    return revokeWalletToken({ jwt, env: this.env });
  }
}
