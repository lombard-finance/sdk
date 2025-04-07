import { rpcUrlConfig } from './rpc-url-config';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP, ChainId } from '../common/chains';
import { createPublicClient, http, PublicClient } from 'viem';

type MakePublicClientParameters = {
  chainId: ChainId;
  rpcUrl?: string;
};

/**
 * Creates the public (read-only) client for specified `chainId`.
 * @param chainId - The chain id
 * @param rpcUrl - The overridden RPC url for specified chain id.
 * @returns The public client instance
 */
export function makePublicClient({
  chainId,
  rpcUrl,
}: MakePublicClientParameters): PublicClient {
  const override = rpcUrl ? { [chainId]: rpcUrl } : undefined;
  const rpcUrls = { ...rpcUrlConfig, ...override };

  const chain = CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId];
  const transport = http(rpcUrls[chainId]);

  const publicClient = createPublicClient({
    chain,
    transport,
  });

  return publicClient as PublicClient<typeof transport>;
}
