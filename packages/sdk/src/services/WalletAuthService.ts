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
  WalletSignInParams,
  WalletSignInResult,
  WalletVerifyRequest,
  WalletVerifyResponse,
  WalletVerifyResult,
} from '@lombard.finance/sdk-common';

import { pollWalletVerification } from '../api-functions/walletAuth/pollWalletVerification';
import { requestWalletChallenge } from '../api-functions/walletAuth/requestWalletChallenge';
import { revokeWalletToken } from '../api-functions/walletAuth/revokeWalletToken';
import { verifyWalletSignature } from '../api-functions/walletAuth/verifyWalletSignature';

export class WalletAuthService implements IWalletAuthService {
  constructor(protected readonly env: Env) {}

  /**
   * Challenge, sign, verify — and poll when the chain settles on-chain.
   *
   * Consumers reimplemented this on top of the three primitives, which means
   * each of them re-derived the sync/async branch. That branch is not a choice:
   * an EOA on EVM, Solana or Sui is verified off-chain and the token is in the
   * verify response, while a Safe or a Starknet account is verified through a
   * contract call and only yields a token once polled. A consumer that handles
   * only the first case appears to work until the first contract wallet signs
   * in, then strands that user with a signature and no token.
   *
   * Signing stays with the caller: the SDK holds no key material, and each
   * chain's wallets expose a different signing method.
   *
   * A client secret the challenge issues is bound to that challenge, so it is
   * carried into verify and every status poll. Dropping it works only while
   * the gateway does not require one.
   */
  async signIn({
    address,
    chain,
    sign,
  }: WalletSignInParams): Promise<WalletSignInResult> {
    const { payload, clientSecret } = await this.requestChallenge({
      address,
      chain,
    });
    const secret = clientSecret ? { clientSecret } : {};
    const { signature, publicKey } = await sign(payload);

    const verification = await this.verifySignature({
      address,
      chain,
      payload,
      signature,
      publicKey,
      ...secret,
    });

    const { jwt, expiresAt } =
      verification.kind === 'complete'
        ? verification
        : // Polls to completion internally, on its own budget.
          await this.pollVerification({
            verificationId: verification.verificationId,
            ...secret,
          });

    return { jwt, expiresAt, address };
  }

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
