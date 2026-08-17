import { Env } from '@lombard.finance/sdk-common';

import { getApiConfig } from '../common/api-config';
import { ChainId } from '../common/chains';

export type TRpcUrlConfig = Record<number, string>;

// /multi-rpc/v2 replaces the open /multi-rpc/proxy transport. v2 accepts only
// the JSON-RPC methods a wallet client genuinely needs and rejects the rest
// outright, where the old route merely logged them. Every method this SDK
// issues — readContract, simulateContract, multicall,
// waitForTransactionReceipt, estimateFeesPerGas, getChainId — is on that list.
export const RPC_URL = 'https://bff.prod.lombard-fi.com/multi-rpc/v2';

export const rpcUrlConfig: TRpcUrlConfig = {
  [ChainId.ethereum]: `${RPC_URL}/eth`,
  [ChainId.base]: `${RPC_URL}/base`,
  // [ChainId.binanceSmartChain]: 'https://bsc-dataseed.bnbchain.org',
  [ChainId.binanceSmartChain]: `${RPC_URL}/bsc`,
  [ChainId.corn]: `${RPC_URL}/corn_maizenet`,
  [ChainId.katana]: `${RPC_URL}/katana`,
  [ChainId.megaeth]: 'https://mainnet.megaeth.com/rpc',
  [ChainId.sonic]: `${RPC_URL}/sonic_mainnet`,
  [ChainId.stable]: 'https://rpc.stable.xyz',
  [ChainId.tac]: `${RPC_URL}/tac`,
  [ChainId.monad]: `${RPC_URL}/monad_mainnet`,
  // Testnets:
  [ChainId.baseSepoliaTestnet]: `${RPC_URL}/base_sepolia`,
  [ChainId.binanceSmartChainTestnet]:
    'https://bsc-testnet-dataseed.bnbchain.org',
  [ChainId.holesky]: `${RPC_URL}/eth_holesky`,
  [ChainId.sepolia]: `${RPC_URL}/eth_sepolia`,
  // Use direct Sonic Labs RPC for testnet (proxy returns 403)
  [ChainId.sonicBlazeTestnet]: 'https://rpc.blaze.soniclabs.com',
};

export function getRpcUrlConfig(env: Env) {
  const { bffApiUrl: baseUrl } = getApiConfig(env);

  const proxy = `${baseUrl}/multi-rpc/v2`;

  return {
    [ChainId.ethereum]: `${proxy}/eth`,
    [ChainId.base]: `${proxy}/base`,
    [ChainId.binanceSmartChain]: 'https://bsc-dataseed.bnbchain.org',
    [ChainId.corn]: `${proxy}/corn_maizenet`,
    [ChainId.katana]: `${proxy}/katana`,
    [ChainId.monad]: `${proxy}/monad_mainnet`,
    [ChainId.megaeth]: 'https://mainnet.megaeth.com/rpc',
    [ChainId.sonic]: `${proxy}/sonic_mainnet`,
    [ChainId.tac]: `${proxy}/tac`,

    // Testnets:
    [ChainId.baseSepoliaTestnet]: `${proxy}/base_sepolia`,
    [ChainId.binanceSmartChainTestnet]:
      'https://bsc-testnet-dataseed.bnbchain.org',
    [ChainId.holesky]: `${proxy}/eth_holesky`,
    [ChainId.sepolia]: `${proxy}/eth_sepolia`,
    // Use direct Sonic Labs RPC for testnet (proxy returns 403)
    [ChainId.sonicBlazeTestnet]: 'https://rpc.blaze.soniclabs.com',
    [ChainId.stable]: 'https://rpc.stable.xyz',
  } as TRpcUrlConfig;
}
