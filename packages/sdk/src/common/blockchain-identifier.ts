import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { ChainId, SuiChain } from './chains';

export const BlockchainIdentifier = {
  eth: 'DESTINATION_BLOCKCHAIN_ETHEREUM',
  ethOld: 'BLOCKCHAIN_ETHEREUM',

  base: 'DESTINATION_BLOCKCHAIN_BASE',
  baseOld: 'BLOCKCHAIN_BASE',

  bsc: 'DESTINATION_BLOCKCHAIN_BSC',
  bscOld: 'BLOCKCHAIN_BSC',

  sui: 'DESTINATION_BLOCKCHAIN_SUI',
  suiOld: 'BLOCKCHAIN_SUI',

  sonic: 'DESTINATION_BLOCKCHAIN_SONIC',
  sonicOld: 'BLOCKCHAIN_SONIC',
} as const;

export type BlockchainIdentifier =
  (typeof BlockchainIdentifier)[keyof typeof BlockchainIdentifier];

export function getChainNameById(
  chainId: ChainId | SuiChain,
): BlockchainIdentifier {
  if (
    chainId === ChainId.ethereum ||
    chainId === ChainId.holesky ||
    chainId === ChainId.sepolia
  ) {
    return BlockchainIdentifier.eth;
  }

  if (chainId === ChainId.base || chainId === ChainId.baseSepoliaTestnet) {
    return BlockchainIdentifier.base;
  }

  if (
    chainId === ChainId.binanceSmartChain ||
    chainId === ChainId.binanceSmartChainTestnet
  ) {
    return BlockchainIdentifier.bsc;
  }

  if (chainId === ChainId.sonic || chainId === ChainId.sonicBlazeTestnet) {
    return BlockchainIdentifier.sonic;
  }

  if (chainId === 'sui:testnet' || chainId === 'sui:mainnet') {
    return BlockchainIdentifier.sui;
  }

  throw new Error(`Unknown chain ID: ${chainId}`);
}

export const getEthNetworkByEnv = (env: Env) =>
  env === Env.prod ? ChainId.ethereum : ChainId.holesky;

export const getBscNetworkByEnv = (env: Env) =>
  env === Env.prod
    ? ChainId.binanceSmartChain
    : ChainId.binanceSmartChainTestnet;

export const getBaseNetworkByEnv = (env: Env) =>
  env === Env.prod ? ChainId.base : ChainId.baseSepoliaTestnet;

export const getSuiNetworkByEnv = (env: Env) =>
  env === Env.prod ? 'sui:mainnet' : 'sui:testnet';

export const getSonicNetworkByEnv = (env: Env) =>
  env === Env.prod ? ChainId.sonic : ChainId.sonicBlazeTestnet;

/**
 * @param chain the chain ID
 * @param env
 * @returns the chain name
 */
export function getChainIdByName(
  chain: string,
  env: Env = DEFAULT_ENV,
): ChainId | SuiChain {
  switch (chain as BlockchainIdentifier) {
    case BlockchainIdentifier.eth:
    case BlockchainIdentifier.ethOld:
      return getEthNetworkByEnv(env);

    case BlockchainIdentifier.base:
    case BlockchainIdentifier.baseOld:
      return getBaseNetworkByEnv(env);

    case BlockchainIdentifier.bsc:
    case BlockchainIdentifier.bscOld:
      return getBscNetworkByEnv(env);

    case BlockchainIdentifier.sui:
    case BlockchainIdentifier.suiOld:
      return getSuiNetworkByEnv(env);

    case BlockchainIdentifier.sonic:
    case BlockchainIdentifier.sonicOld:
      return getSonicNetworkByEnv(env);

    default:
      return ChainId.ethereum;
  }
}
