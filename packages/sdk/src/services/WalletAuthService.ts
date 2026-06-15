/**
 * Wallet Auth Service
 *
 * Implementation of the WalletAuthService interface from sdk-common.
 * Wraps the v2 wallet-auth HTTP endpoints and provides a one-call `signIn`
 * that hides the challenge → sign → verify ceremony.
 *
 * @module services/WalletAuthService
 */

import type {
  EvmProvider,
  ProviderFor,
  ProviderKey,
  RevokeWalletTokenRequest,
  WalletAuthService as IWalletAuthService,
  WalletChallengeRequest,
  WalletChallengeResponse,
  WalletSignInParams,
  WalletSignInResult,
  WalletVerifyRequest,
  WalletVerifyResponse,
} from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';

import { requestWalletChallenge } from '../api-functions/walletAuth/requestWalletChallenge';
import { revokeWalletToken } from '../api-functions/walletAuth/revokeWalletToken';
import { verifyWalletSignature } from '../api-functions/walletAuth/verifyWalletSignature';
import { setStoredAuthToken } from '../common/auth-token';

type GetProvider = <TKey extends ProviderKey>(
  key: TKey,
) => Promise<ProviderFor<TKey>>;

// Default EVM chain name for the auth API — the short `Blockchain` name from
// `/v2/chains`. Prod uses `ethereum`; non-prod uses the testnet variant.
function defaultEvmChain(env: Env): string {
  return env === Env.prod ? 'ethereum' : 'ethereum_sepolia';
}

export class WalletAuthService implements IWalletAuthService {
  constructor(
    private readonly env: Env,
    /** Resolves configured providers; enables EVM auto-signing in `signIn`. */
    private readonly getProvider?: GetProvider,
  ) {}

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

  async signIn(params: WalletSignInParams = {}): Promise<WalletSignInResult> {
    const { sign, persist } = params;
    let { address, chain } = params;

    let signer = sign;

    // No signer provided → default to EVM via the configured provider.
    if (!signer) {
      const provider = (await this.getProvider?.('evm')) as
        | EvmProvider
        | undefined;
      if (!provider) {
        throw new Error(
          'signIn needs an EVM provider or an explicit `sign` callback',
        );
      }
      // `personal_sign`/`eth_requestAccounts` aren't in viem's typed EIP-1193
      // schema in a way that accepts our args — loose-cast the request.
      const request = provider.request as (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      if (!address) {
        const accounts = (await request({
          method: 'eth_requestAccounts',
        })) as string[];
        address = accounts?.[0];
      }
      chain = chain ?? defaultEvmChain(this.env);
      const evmAddress = address;
      signer = async (payload) => {
        const signature = (await request({
          method: 'personal_sign',
          params: [payload, evmAddress],
        })) as string;
        return { signature };
      };
    }

    if (!address) {
      throw new Error('signIn requires `address` when using a custom `sign`');
    }
    if (!chain) {
      throw new Error('signIn requires `chain` when using a custom `sign`');
    }

    const { payload } = await this.requestChallenge({ address, chain });
    const { signature, publicKey } = await signer(payload);
    const { jwt, expiresAt } = await this.verifySignature({
      address,
      chain,
      payload,
      signature,
      publicKey,
    });

    if (persist) {
      setStoredAuthToken(this.env, jwt);
    }

    return { jwt, expiresAt, address };
  }
}
