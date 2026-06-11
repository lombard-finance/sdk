import { AxiosError } from 'axios';
import { Address } from 'viem';

import { getApiConfig } from '../../../common/api-config';
import { ChainId } from '../../../common/chains';
import { getHttpClient } from '../../../common/http-client';
import { IEnvParam } from '../../../common/parameters';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';

/**
 * Per-user endpoints live behind a wallet-JWT gate. The SDK attaches the JWT
 * from the configured auth-token provider (`registerAuthTokenProvider` /
 * `getAuthToken`) — register one before calling these.
 */
export interface BaseUserStrategyParams extends IEnvParam {
  chainId: ChainId;
  owner: Address;
  /** Override the canonical Strategy contract address for this chain. */
  strategy?: Address;
}

/**
 * Maps a Lombard Strategy chain id to the legacy `BLOCKCHAIN_*` string that
 * the vault-manager `/v2/vaults/...` endpoints expect as the `blockchain`
 * query parameter. Kept local to avoid accidentally exporting it from the
 * shared common module (the new APIs only accept the legacy form).
 */
export function getVaultBlockchainParam(chainId: ChainId): string {
  if (chainId === ChainId.base) {
    return 'BLOCKCHAIN_BASE';
  }
  if (chainId === ChainId.baseSepoliaTestnet) {
    return 'BLOCKCHAIN_BASE_SEPOLIA';
  }
  if (
    chainId === ChainId.ethereum ||
    chainId === ChainId.holesky ||
    chainId === ChainId.sepolia
  ) {
    return 'BLOCKCHAIN_ETHEREUM';
  }
  throw new Error(
    `Vault-manager blockchain identifier not configured for chain id: ${chainId}`,
  );
}

/**
 * Resolves the per-user endpoint root: `${baseApiUrl}/v2/vaults/strategies/{address}/users/{owner}`.
 */
export function resolveUserStrategyEndpoint(
  params: BaseUserStrategyParams,
): { root: string; address: Address; blockchain: string } {
  const { chainId, owner, strategy, env } = params;
  assertLombardStrategyChain(chainId);
  const address = resolveStrategyAddress(chainId, strategy);

  const { baseApiUrl } = getApiConfig(env);
  const root = `${baseApiUrl.replace(/\/$/, '')}/v2/vaults/strategies/${address}/users/${owner}`;
  return { root, address, blockchain: getVaultBlockchainParam(chainId) };
}

/**
 * Authenticated GET against the vault-manager. Routes through the SDK's authed
 * HTTP client, which attaches the wallet JWT from the registered auth-token
 * provider. Surfaces 401s as a tagged `UnauthorizedWalletJwtError` so consumers
 * can trigger a re-login.
 */
export async function userAuthorizedGet<T>(
  url: string,
  env: IEnvParam['env'],
): Promise<T> {
  try {
    const { data } = await getHttpClient(env).get<T>(url, {
      headers: { Accept: 'application/json' },
    });
    return data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 401) {
      throw new UnauthorizedWalletJwtError(url);
    }
    throw err;
  }
}

/** Thrown when the vault-manager rejects the wallet JWT (expired / revoked). */
export class UnauthorizedWalletJwtError extends Error {
  constructor(url: string) {
    super(`Wallet JWT rejected by vault-manager (${url})`);
    this.name = 'UnauthorizedWalletJwtError';
  }
}
