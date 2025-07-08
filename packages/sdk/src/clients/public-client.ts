import { getRpcUrlConfig } from './rpc-url-config';
import {
  CHAIN_ID_TO_VIEM_CHAIN_MAP,
  ChainId,
  getChain,
} from '../common/chains';
import { createPublicClient, http, PublicClient } from 'viem';
import { determineEnv } from '../utils/env';
import { Env } from '@lombard.finance/sdk-common';

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

  let chain = CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId];
  if (!chain) {
    chain = getChain(chainId);
  }

  console.info(
    `Creating a public client for ${chainId} with RPC: ${rpcUrls[chainId]}`,
  );

  const transport = http(rpcUrls[chainId]);

  const publicClient = createPublicClient({
    chain,
    transport,
  });

  return publicClient as PublicClient<typeof transport>;
}
