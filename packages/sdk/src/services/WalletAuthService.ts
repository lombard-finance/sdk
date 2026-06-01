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
  WalletAuthService as IWalletAuthService,
  WalletChallengeRequest,
  WalletChallengeResponse,
  WalletVerifyRequest,
  WalletVerifyResponse,
  RevokeWalletTokenRequest,
} from '@lombard.finance/sdk-common';

import { requestWalletChallenge } from '../api-functions/walletAuth/requestWalletChallenge';
import { revokeWalletToken } from '../api-functions/walletAuth/revokeWalletToken';
import { verifyWalletSignature } from '../api-functions/walletAuth/verifyWalletSignature';

export class WalletAuthService implements IWalletAuthService {
  constructor(private readonly env: Env) {}

  requestChallenge(
    params: WalletChallengeRequest,
  ): Promise<WalletChallengeResponse> {
    return requestWalletChallenge({ ...params, env: this.env });
  }

  verifySignature(params: WalletVerifyRequest): Promise<WalletVerifyResponse> {
    return verifyWalletSignature({ ...params, env: this.env });
  }

  revokeToken({ jwt }: RevokeWalletTokenRequest): Promise<void> {
    return revokeWalletToken({ jwt, env: this.env });
  }
}
