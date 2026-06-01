/**
 * Wallet Auth Module
 *
 * Provides the Lombard backend wallet-auth service (challenge / verify /
 * revoke). Signing the challenge with the user's wallet is intentionally
 * out of scope here — it is chain-specific and lives in the corresponding
 * chain SDK packages.
 *
 * @module modules/walletAuthModule
 */

import type {
  WalletAuthService as IWalletAuthService,
  SdkModule,
} from '@lombard.finance/sdk-common';

import { WalletAuthService } from '../services/WalletAuthService';

/**
 * Create wallet-auth module.
 *
 * @example
 * ```ts
 * const sdk = await createLombardSDK({
 *   env: Env.prod,
 *   modules: [walletAuthModule()],
 * });
 * const { payload } = await sdk.walletAuth.requestChallenge({
 *   address: '0x...',
 *   chain: 'ethereum',
 * });
 * ```
 */
export function walletAuthModule(): SdkModule<'walletAuth', IWalletAuthService> {
  return {
    id: 'walletAuth',
    register(ctx) {
      return new WalletAuthService(ctx.env);
    },
  };
}

export { WalletAuthService };
export type { IWalletAuthService as WalletAuthServiceInterface };
export type {
  RevokeWalletTokenRequest,
  WalletAuthChain,
  WalletChallengeRequest,
  WalletChallengeResponse,
  WalletVerifyRequest,
  WalletVerifyResponse,
} from '@lombard.finance/sdk-common';
