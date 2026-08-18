import { Env, TRpcUrlConfig } from '@lombard.finance/sdk-common';

import { ChainId } from '../common/chains';

// Re-exported so the public API keeps its existing import path.
export type { TRpcUrlConfig };

/**
 * Public, per-chain RPC defaults. Consumers may override individual entries
 * (e.g. via `makePublicClient({ rpcUrl })`) or supply their own
 * `TRpcUrlConfig` entirely.
 */
export const rpcUrlConfig: TRpcUrlConfig = {
  [ChainId.ethereum]: 'https://cloudflare-eth.com',
  [ChainId.base]: 'https://mainnet.base.org',
  [ChainId.binanceSmartChain]: 'https://bsc-dataseed.bnbchain.org',
  [ChainId.katana]: 'https://rpc.katana.network',
  [ChainId.megaeth]: 'https://mainnet.megaeth.com/rpc',
  [ChainId.monad]: 'https://rpc.monad.xyz',
  [ChainId.sonic]: 'https://rpc.soniclabs.com',
  [ChainId.stable]: 'https://rpc.stable.xyz',
  [ChainId.tac]: 'https://rpc.tac.build',
  // Testnets:
  [ChainId.baseSepoliaTestnet]: 'https://sepolia.base.org',
  [ChainId.binanceSmartChainTestnet]:
    'https://bsc-testnet-dataseed.bnbchain.org',
  [ChainId.holesky]: 'https://holesky.drpc.org',
  [ChainId.sepolia]: 'https://ethereum-sepolia-rpc.publicnode.com',
};

/**
 * Returns the public RPC defaults.
 *
 * The endpoints are public and identical across environments, so `env` is
 * accepted for backwards compatibility but no longer affects the result.
 */
export function getRpcUrlConfig(_env?: Env): TRpcUrlConfig {
  return { ...rpcUrlConfig };
}
