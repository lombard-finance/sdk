import axios, { AxiosError } from 'axios';
import { Address } from 'viem';

import { getApiConfig } from '../../../common/api-config';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import { resolveStrategy, StrategyId } from '../config';

/**
 * Per-user endpoints live behind a wallet-JWT gate. Each parameter object
 * extends this base shape; callers pass a `walletJwt` they obtained via the
 * `/api/v2/auth/wallet/*` challenge → verify flow.
 *
 * Env-first: `env` (+ optional `strategyId`) selects the deployment; the chain
 * follows from it.
 */
export interface BaseUserStrategyParams extends IEnvParam {
  owner: Address;
  /** Chain to target when the env spans multiple chains; defaults to primary. */
  chainId?: ChainId;
  /** Strategy to target. Defaults to the canonical strategy (BTCoc). */
  strategyId?: StrategyId;
  /** Override the resolved Strategy contract address. */
  strategy?: Address;
  /** JWT from the wallet-auth flow. Sent as `Authorization: Bearer …`. */
  walletJwt: string;
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
  const { owner, strategy, strategyId, env, chainId: requestedChainId } =
    params;
  const { chainId, address } = resolveStrategy({
    env,
    strategyId,
    strategy,
    chainId: requestedChainId,
  });

  const { baseApiUrl } = getApiConfig(env);
  const root = `${baseApiUrl.replace(/\/$/, '')}/v2/vaults/strategies/${address}/users/${owner}`;
  return { root, address, blockchain: getVaultBlockchainParam(chainId) };
}

/**
 * Thin axios.get wrapper that injects the wallet JWT as
 * `Authorization: Bearer …` (the v2 API standard) and surfaces 401s as a
 * tagged `UnauthorizedWalletJwtError` so consumers can trigger a re-login
 * without inspecting raw axios error shapes.
 */
export async function userAuthorizedGet<T>(
  url: string,
  walletJwt: string,
): Promise<T> {
  try {
    const { data } = await axios.get<T>(url, {
      headers: {
        Authorization: `Bearer ${walletJwt}`,
        Accept: 'application/json',
      },
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
