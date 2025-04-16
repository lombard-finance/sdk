import {
  base,
  baseSepolia,
  berachain,
  berachainTestnetbArtio,
  bsc,
  bscTestnet,
  corn,
  holesky,
  mainnet,
  morph,
  morphHolesky,
  sepolia,
  sonic,
  sonicBlazeTestnet,
  swellchain,
} from 'viem/chains';

export const SUI_DEVNET_CHAIN = 'sui:devnet' as const;
export const SUI_TESTNET_CHAIN = 'sui:testnet' as const;
export const SUI_LOCALNET_CHAIN = 'sui:localnet' as const;
export const SUI_MAINNET_CHAIN = 'sui:mainnet' as const;

export type SuiChain =
  | typeof SUI_DEVNET_CHAIN
  | typeof SUI_TESTNET_CHAIN
  | typeof SUI_LOCALNET_CHAIN
  | typeof SUI_MAINNET_CHAIN;

export const ChainId = {
  ethereum: 1,
  base: 8453,
  berachain: 80094,
  binanceSmartChain: 56,
  corn: 21000000,
  holesky: 17000,
  morph: 2818,
  sonic: 146,
  swell: 1923,
  // Testnets:
  baseSepoliaTestnet: 84532,
  berachainBartioTestnet: 80084,
  binanceSmartChainTestnet: 97,
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

export function isValidChain(chainId: number): chainId is ChainId {
  return Object.values(ChainId).includes(chainId as ChainId);
}
