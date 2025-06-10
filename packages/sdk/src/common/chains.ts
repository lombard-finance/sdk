import { extractChain } from 'viem';
import {
  base,
  baseSepolia,
  berachain,
  berachainTestnetbArtio,
  bsc,
  bscTestnet,
  corn,
  etherlink,
  holesky,
  mainnet,
  morph,
  morphHolesky,
  sepolia,
  sonic,
  sonicBlazeTestnet,
  swellchain,
} from 'viem/chains';

import * as allChains from 'viem/chains';

export const SUI_DEVNET_CHAIN = 'sui:devnet' as const;
export const SUI_TESTNET_CHAIN = 'sui:testnet' as const;
export const SUI_LOCALNET_CHAIN = 'sui:localnet' as const;
export const SUI_MAINNET_CHAIN = 'sui:mainnet' as const;

export type SuiChain =
  | typeof SUI_DEVNET_CHAIN
  | typeof SUI_TESTNET_CHAIN
  | typeof SUI_LOCALNET_CHAIN
  | typeof SUI_MAINNET_CHAIN;

export const SOLANA_MAINNET_CHAIN = 'solana:mainnet-beta' as const;
export const SOLANA_TESTNET_CHAIN = 'solana:testnet' as const;
export const SOLANA_DEVNET_CHAIN = 'solana:devnet' as const;

export type SolanaChain =
  | typeof SOLANA_MAINNET_CHAIN
  | typeof SOLANA_TESTNET_CHAIN
  | typeof SOLANA_DEVNET_CHAIN;

export const ChainId = {
  ethereum: 1,
  base: 8453,
  berachain: 80094,
  binanceSmartChain: 56,
  corn: 21000000,
  etherlink: 42793,
  morph: 2818,
  sonic: 146,
  swell: 1923,
  // Testnets:
  baseSepoliaTestnet: 84532,
  berachainBartioTestnet: 80084,
  binanceSmartChainTestnet: 97,
  holesky: 17000,
  morphHolesky: 2810,
  sepolia: 11155111,
  sonicBlazeTestnet: 57054,
} as const;

export type ChainId = (typeof ChainId)[keyof typeof ChainId];

export const CHAIN_ID_TO_VIEM_CHAIN_MAP = {
  [ChainId.ethereum]: mainnet,
  [ChainId.base]: base,
  [ChainId.berachain]: berachain,
  [ChainId.binanceSmartChain]: bsc,
  [ChainId.corn]: corn,
  [ChainId.etherlink]: etherlink,
  [ChainId.morph]: morph,
  [ChainId.sonic]: sonic,
  [ChainId.swell]: swellchain,
  // Testnets:
  [ChainId.baseSepoliaTestnet]: baseSepolia,
  [ChainId.berachainBartioTestnet]: berachainTestnetbArtio,
  [ChainId.binanceSmartChainTestnet]: bscTestnet,
  [ChainId.holesky]: holesky,
  [ChainId.morphHolesky]: morphHolesky,
  [ChainId.sepolia]: sepolia,
  [ChainId.sonicBlazeTestnet]: sonicBlazeTestnet,
};

export const CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP = {
  [ChainId.ethereum]: 'ethereum',
  [ChainId.base]: 'base',
  [ChainId.berachain]: 'berachain',
  [ChainId.binanceSmartChain]: 'bsc',
  [ChainId.corn]: 'corn',
  [ChainId.etherlink]: 'etherlink',
  [ChainId.morph]: 'morph',
  [ChainId.sonic]: 'sonic',
  [ChainId.swell]: 'swellchain',
} as const;
type LlamaChain =
  (typeof CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP)[keyof typeof CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP];

export function isValidChain(chainId: number): chainId is ChainId {
  return Object.values(ChainId).includes(chainId as ChainId);
}

export const getLlamaChainName = (chainId: ChainId): LlamaChain | undefined => {
  const name =
    CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP[
      chainId as keyof typeof CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP
    ];
  return name;
};

export const getChain = (chainId: number) =>
  extractChain({ chains: Object.values(allChains), id: chainId as ChainId });
