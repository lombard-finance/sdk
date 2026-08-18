import { Env } from '@lombard.finance/sdk-common';
import { Chain, createPublicClient, http, PublicClient } from 'viem';

import {
  CHAIN_ID_TO_VIEM_CHAIN_MAP,
  ChainId,
  getChain,
} from '../common/chains';
import { determineEnv } from '../utils/env';
import { getRpcUrlConfig } from './rpc-url-config';

type MakePublicClientParameters = {
  chainId: ChainId;
  /** Optional single-chain RPC override. Falls back to public defaults. */
  rpcUrl?: string;
  env?: Env;
};

/**
 * Creates the public (read-only) client for the specified `chainId`.
 *
 * RPC URL is the per-call `rpcUrl` override if provided, otherwise the
 * public default from `rpcUrlConfig`.
 */
export function makePublicClient({
  chainId,
  rpcUrl,
  env,
}: MakePublicClientParameters): PublicClient {
  const environment = env || determineEnv(chainId);
  const defaults = getRpcUrlConfig(environment);
  const url = rpcUrl ?? defaults[chainId];

  let chain: Chain | undefined = CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId];
  if (!chain) {
    chain = getChain(chainId);
  }

  const transport = http(url);

  const publicClient = createPublicClient({
    chain,
    transport,
  });

  return publicClient as PublicClient<typeof transport>;
}
