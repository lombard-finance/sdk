import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import {
  ChainId,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from './chains';

export const BlockchainIdentifier = {
  eth: 'DESTINATION_BLOCKCHAIN_ETHEREUM',
  ethOld: 'BLOCKCHAIN_ETHEREUM',

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

  if (chainId === ChainId.base || chainId === ChainId.baseSepoliaTestnet) {
    return BlockchainIdentifier.base;
  }

  if (
    chainId === ChainId.binanceSmartChain ||
    chainId === ChainId.binanceSmartChainTestnet
  ) {
    return BlockchainIdentifier.bsc;
  }

  if (chainId === ChainId.katana || chainId === ChainId.katanaTatara) {
    return BlockchainIdentifier.katana;
  }

  if (chainId === ChainId.sonic || chainId === ChainId.sonicBlazeTestnet) {
    return BlockchainIdentifier.sonic;
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
  env === Env.prod ? ChainId.ethereum : ChainId.holesky;

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

    case BlockchainIdentifier.base:
    case BlockchainIdentifier.baseOld:
      return getBaseNetworkByEnv(env);

    case BlockchainIdentifier.bsc:
    case BlockchainIdentifier.bscOld:
      return getBscNetworkByEnv(env);

    case BlockchainIdentifier.katana:
    case BlockchainIdentifier.katanaOld:
      return env === 'prod' ? ChainId.katana : ChainId.katanaTatara;

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

    default:
      return ChainId.ethereum;
  }
}
