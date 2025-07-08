import { defineChain, extractChain, type EIP1193Provider } from 'viem';
import { addChain as viem_addChain } from 'viem/actions';
import * as viem_chains from 'viem/chains';
import { makeWalletClient } from '../clients/wallet-client';

const {
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
} = viem_chains;

// FIXME: Remove this custom chain definition once katana is supported by viem
export const katana = defineChain({
  id: 747474,
  name: 'Katana',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.katana.network'],
      webSocket: ['wss://rpc.katana.network'],
    },
  },
  blockExplorers: {
    default: { name: 'Katana Explorer', url: 'https://explorer.katanarpc.com' },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 1898013, // TODO: Confirm this
    },
  },
});

export const katanaTatara = defineChain({
  id: 129399,
  name: 'Tatara',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.tatara.katanarpc.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tatara Explorer',
      url: 'https://explorer.tatara.katana.network',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 7771207, // TODO: Confirm this
    },
  },
});

export const allChains: Record<string, viem_chains.Chain> = {
  ...viem_chains,
  katana,
  katanaTatara,
};

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
  katana: 747474,
  morph: 2818,
  sonic: 146,
  swell: 1923,
  // Testnets:
  baseSepoliaTestnet: 84532,
  berachainBartioTestnet: 80084,
  binanceSmartChainTestnet: 97,
  holesky: 17000,
  katanaTatara: 129399,
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
  [ChainId.katana]: katana,
  [ChainId.morph]: morph,
  [ChainId.sonic]: sonic,
  [ChainId.swell]: swellchain,
  // Testnets:
  [ChainId.baseSepoliaTestnet]: baseSepolia,
  [ChainId.berachainBartioTestnet]: berachainTestnetbArtio,
  [ChainId.binanceSmartChainTestnet]: bscTestnet,
  [ChainId.holesky]: holesky,
  [ChainId.katanaTatara]: katanaTatara,
  [ChainId.morphHolesky]: morphHolesky,
  [ChainId.sepolia]: sepolia,
  [ChainId.sonicBlazeTestnet]: sonicBlazeTestnet,
};

type KatanaChain = typeof ChainId.katana | typeof ChainId.katanaTatara;
export const isKatanaChain = (chainId: unknown): chainId is KatanaChain => {
  return ([ChainId.katana, ChainId.katanaTatara] as number[]).includes(
    chainId as number,
  );
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

export type AddChainParameters = {
  provider: EIP1193Provider;
  chainId: ChainId;
};

export async function addChain({ provider, chainId }: AddChainParameters) {
  const walletClient = makeWalletClient({
    provider,
    chainId: ChainId.ethereum,
  });
  await viem_addChain(walletClient, {
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
  });
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
