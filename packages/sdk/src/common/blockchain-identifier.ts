import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';

import {
  ChainId,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  SolanaChain,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  StarknetChainId,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
  SuiChain,
} from './chains';
import { featureConfig } from './feature-config';

export const BlockchainIdentifier = {
  eth: 'DESTINATION_BLOCKCHAIN_ETHEREUM',
  ethOld: 'BLOCKCHAIN_ETHEREUM',

  avalanche: 'DESTINATION_BLOCKCHAIN_AVALANCHE',
  avalancheOld: 'BLOCKCHAIN_AVALANCHE',

  base: 'DESTINATION_BLOCKCHAIN_BASE',
  baseOld: 'BLOCKCHAIN_BASE',

  bsc: 'DESTINATION_BLOCKCHAIN_BSC',
  bscOld: 'BLOCKCHAIN_BSC',

  katana: 'DESTINATION_BLOCKCHAIN_KATANA',
  katanaOld: 'BLOCKCHAIN_KATANA',

  sui: 'DESTINATION_BLOCKCHAIN_SUI',
  suiOld: 'BLOCKCHAIN_SUI',

  sonic: 'DESTINATION_BLOCKCHAIN_SONIC',
  sonicOld: 'BLOCKCHAIN_SONIC',

  solana: 'DESTINATION_BLOCKCHAIN_SOLANA',
  solanaOld: 'BLOCKCHAIN_SOLANA',

  starknet: 'DESTINATION_BLOCKCHAIN_STARKNET',
  starknetOld: 'BLOCKCHAIN_STARKNET',

  monad: 'DESTINATION_BLOCKCHAIN_MONAD',
  monadOld: 'BLOCKCHAIN_MONAD',

  stable: 'DESTINATION_BLOCKCHAIN_STABLE',
  stableOld: 'BLOCKCHAIN_STABLE',

  megaeth: 'DESTINATION_BLOCKCHAIN_MEGAETH',
  megaethOld: 'BLOCKCHAIN_MEGAETH',

  bitcoin: 'DESTINATION_BLOCKCHAIN_BITCOIN',
  bitcoinOld: 'BLOCKCHAIN_BITCOIN',
} as const;

export type BlockchainIdentifier =
  (typeof BlockchainIdentifier)[keyof typeof BlockchainIdentifier];

export function getChainNameById(
  chainId: ChainId | SuiChain | SolanaChain | StarknetChainId,
): BlockchainIdentifier {
  if (
    chainId === ChainId.ethereum ||
    chainId === ChainId.holesky ||
    chainId === ChainId.sepolia
  ) {
    return BlockchainIdentifier.eth;
  }

  if (
    (featureConfig.isAvalancheMainnetEnabled && chainId === ChainId.avalanche) ||
    (featureConfig.isAvalancheFujiEnabled && chainId === ChainId.avalancheFuji)
  ) {
    return BlockchainIdentifier.avalanche;
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

  if (chainId === ChainId.katana) {
    return BlockchainIdentifier.katana;
  }

  if (chainId === ChainId.sonic || chainId === ChainId.sonicBlazeTestnet) {
    return BlockchainIdentifier.sonic;
  }

  if (featureConfig.isMonadEnabled && chainId === ChainId.monad) {
    return BlockchainIdentifier.monad;
  }

  if (chainId === ChainId.megaeth) {
    return BlockchainIdentifier.megaeth;
  }

  if (chainId === ChainId.stable) {
    return BlockchainIdentifier.stable;
  }

  if (chainId === SUI_TESTNET_CHAIN || chainId === SUI_MAINNET_CHAIN) {
    return BlockchainIdentifier.sui;
  }

  if (
    chainId === SOLANA_DEVNET_CHAIN ||
    chainId === SOLANA_TESTNET_CHAIN ||
    chainId === SOLANA_MAINNET_CHAIN
  ) {
    return BlockchainIdentifier.solana;
  }

  if (
    chainId === STARKNET_MAINNET_CHAIN ||
    chainId === STARKNET_SEPOLIA_CHAIN
  ) {
    return BlockchainIdentifier.starknet;
  }

  throw new Error(`Unknown chain ID: ${chainId}`);
}

export const getEthNetworkByEnv = (env: Env) =>
  env === Env.prod ? ChainId.ethereum : ChainId.sepolia;

export const getBscNetworkByEnv = (env: Env) =>
  env === Env.prod
    ? ChainId.binanceSmartChain
    : ChainId.binanceSmartChainTestnet;

export const getBaseNetworkByEnv = (env: Env) =>
  env === Env.prod ? ChainId.base : ChainId.baseSepoliaTestnet;

export const getSuiNetworkByEnv = (env: Env) =>
  env === Env.prod ? SUI_MAINNET_CHAIN : SUI_TESTNET_CHAIN;

export const getSonicNetworkByEnv = (env: Env) =>
  env === Env.prod ? ChainId.sonic : ChainId.sonicBlazeTestnet;

export const getSolanaNetworkByEnv = (env: Env) =>
  env === Env.prod ? SOLANA_MAINNET_CHAIN : SOLANA_DEVNET_CHAIN;

export const getStarknetNetworkByEnv = (env: Env) =>
  env === Env.prod ? STARKNET_MAINNET_CHAIN : STARKNET_SEPOLIA_CHAIN;

/**
 * @param chain the chain ID
 * @param env
 * @returns the chain name
 */
export function getChainIdByName(
  chain: string,
  env: Env = DEFAULT_ENV,
): ChainId | SuiChain | SolanaChain | StarknetChainId {
  switch (chain as BlockchainIdentifier) {
    case BlockchainIdentifier.eth:
    case BlockchainIdentifier.ethOld:
      return getEthNetworkByEnv(env);

    case BlockchainIdentifier.avalanche:
    case BlockchainIdentifier.avalancheOld:
      return env === Env.prod ? ChainId.avalanche : ChainId.avalancheFuji;

    case BlockchainIdentifier.base:
    case BlockchainIdentifier.baseOld:
      return getBaseNetworkByEnv(env);

    case BlockchainIdentifier.bsc:
    case BlockchainIdentifier.bscOld:
      return getBscNetworkByEnv(env);

    case BlockchainIdentifier.katana:
    case BlockchainIdentifier.katanaOld:
      return ChainId.katana;

    case BlockchainIdentifier.sui:
    case BlockchainIdentifier.suiOld:
      return getSuiNetworkByEnv(env);

    case BlockchainIdentifier.sonic:
    case BlockchainIdentifier.sonicOld:
      return getSonicNetworkByEnv(env);

    case BlockchainIdentifier.solana:
    case BlockchainIdentifier.solanaOld:
      return getSolanaNetworkByEnv(env);

    case BlockchainIdentifier.starknet:
    case BlockchainIdentifier.starknetOld:
      return getStarknetNetworkByEnv(env);

    case BlockchainIdentifier.monad:
    case BlockchainIdentifier.monadOld:
      return ChainId.monad;

    case BlockchainIdentifier.stable:
    case BlockchainIdentifier.stableOld:
      return ChainId.stable;

    case BlockchainIdentifier.megaeth:
    case BlockchainIdentifier.megaethOld:
      return ChainId.megaeth;

    default:
      return ChainId.ethereum;
  }
}
