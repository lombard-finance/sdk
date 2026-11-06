import { Env } from '@lombard.finance/sdk-common';
import { Chain, createPublicClient, http, PublicClient } from 'viem';

import {
  CHAIN_ID_TO_VIEM_CHAIN_MAP,
  ChainId,
  getChain,
} from '../common/chains';
import { determineEnv } from '../utils/env';
import { getRpcUrlConfig } from './rpc-url-config';

/**
 * Chains with no public RPC to fall back on: the SDK configures none, and the
 * viem chain's default host no longer resolves. A client for one of these
 * needs `rpcUrl`.
 */
const CHAINS_WITHOUT_PUBLIC_RPC: ReadonlySet<number> = new Set([
  ChainId.sonicBlazeTestnet,
]);

type MakePublicClientParameters = {
  chainId: ChainId;
  rpcUrl?: string;
  env?: Env;
};

/**
 * Creates the public (read-only) client for specified `chainId`.
 * @param chainId - The chain id
 * @param rpcUrl - The overridden RPC url for specified chain id.
 * @returns The public client instance
 * @throws if the chain has no public RPC and `rpcUrl` is not given.
 */
export function makePublicClient({
  chainId,
  rpcUrl,
  env,
}: MakePublicClientParameters): PublicClient {
  const override = rpcUrl ? { [chainId]: rpcUrl } : undefined;

  const environment = env || determineEnv(chainId);
  const rpcUrlConfig = getRpcUrlConfig(environment);

  const rpcUrls = { ...rpcUrlConfig, ...override };

  let chain: Chain | undefined = CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId];
  if (!chain) {
    chain = getChain(chainId);
  }

  const url = rpcUrls[chainId];
  if (!url && CHAINS_WITHOUT_PUBLIC_RPC.has(chainId)) {
    throw new Error(
      `No RPC URL is configured for ${chain?.name ?? 'this chain'} (chain ${chainId}). Pass \`rpcUrl\` to create a client for it.`,
    );
  }

  const transport = http(url);

  const publicClient = createPublicClient({
    chain,
    transport,
  });

  return publicClient as PublicClient<typeof transport>;
}
