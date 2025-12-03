import { defineChain, type EIP1193Provider, extractChain } from 'viem';
import { addChain as viem_addChain } from 'viem/actions';
import * as viem_chains from 'viem/chains';

import { makeWalletClient } from '../clients/wallet-client';
import { featureConfig } from './feature-config';

const {
  avalanche,
  avalancheFuji,
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
  testnet: true,
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

// FIXME: Remove this custom chain definition once TAC is supported by viem
export const tac = defineChain({
  id: 239,
  name: 'TAC',
  nativeCurrency: {
    decimals: 18,
    name: 'TAC',
    symbol: 'TAC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.tac.build'],
    },
  },
  blockExplorers: {
    default: { name: 'TAC Explorer', url: 'https://explorer.tac.build' },
  },
});

export const bob = defineChain({
  id: 60808,
  name: 'BOB',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.gobob.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'BOB Explorer', url: 'https://explorer.gobob.xyz' },
  },
});

export const bobSepolia = defineChain({
  id: 808813,
  name: 'BOB Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://bob-sepolia.rpc.gobob.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BOB Sepolia Explorer',
      url: 'https://bob-sepolia.explorer.gobob.xyz/',
    },
  },
});

export const monad = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MONAD',
  },
  rpcUrls: {
    default: {
      http: ['https://monad-mainnet.drpc.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://monadvision.com',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 9248132,
    },
  },
});

export const stable = defineChain({
  id: 988,
  name: 'Stable',
  nativeCurrency: {
    decimals: 18,
    name: 'gUSDT',
    symbol: 'gUSDT',
  },
  rpcUrls: {
    default: {
      http: [
        'https://partners-rpc.stable.xyz/lombard.075830647a2c30190712a9d102011ffe5a2a01d24ff3405f711d6ea8aca10baf',
      ],
    }, // TODO: Update with the correct RPC URL once the stable network is live
  },
  blockExplorers: {
    default: {
      name: 'Stable Explorer',
      url: 'https://stablescan.xyz',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 1,
    },
  },
});

export const megaeth = defineChain({
  id: 4326,
  name: 'MegaETH',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [
        'https://alpha.megaeth.com/rpc?user=lombard+v1&token=1763427229-%2Bx6HFUDu9OhJwV%2FTCFOL0xTt%2FPJRAXPeirIcuytvnes%3D',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'MegaETH Explorer',
      url: 'http://megaeth-testnet-v3.blockscout.com',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 2591807, // TODO: Confirm this
    },
  },
});

export const allChains: Record<string, viem_chains.Chain> = {
  ...viem_chains,
  katana,
  katanaTatara,
  tac,
  monad,
  stable,
  megaeth,
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

export const isSuiChain = (chainId: unknown): chainId is SuiChain => {
  return (
    [
      SUI_DEVNET_CHAIN,
      SUI_TESTNET_CHAIN,
      SUI_LOCALNET_CHAIN,
      SUI_MAINNET_CHAIN,
    ] as string[]
  ).includes(chainId as string);
};

export const SOLANA_MAINNET_CHAIN = 'solana:mainnet-beta' as const;
export const SOLANA_TESTNET_CHAIN = 'solana:testnet' as const;
export const SOLANA_DEVNET_CHAIN = 'solana:devnet' as const;

export type SolanaChain =
  | typeof SOLANA_MAINNET_CHAIN
  | typeof SOLANA_TESTNET_CHAIN
  | typeof SOLANA_DEVNET_CHAIN;

export const isSolanaChain = (chainId: unknown): chainId is SolanaChain => {
  return (
    [
      SOLANA_MAINNET_CHAIN,
      SOLANA_TESTNET_CHAIN,
      SOLANA_DEVNET_CHAIN,
    ] as string[]
  ).includes(chainId as string);
};

// Starknet chain identifiers:
export const STARKNET_MAINNET_CHAIN = '0x534e5f4d41494e' as const;
export const STARKNET_SEPOLIA_CHAIN = '0x534e5f5345504f4c4941' as const;
export type StarknetChainId =
  | typeof STARKNET_MAINNET_CHAIN
  | typeof STARKNET_SEPOLIA_CHAIN;

export const isStarknetChainId = (
  chainId: unknown,
): chainId is StarknetChainId => {
  return (
    chainId === STARKNET_MAINNET_CHAIN || chainId === STARKNET_SEPOLIA_CHAIN
  );
};

export const ChainId = {
  ethereum: 1,
  avalanche: 43114,
  base: 8453,
  berachain: 80094,
  binanceSmartChain: 56,
  corn: 21000000,
  etherlink: 42793,
  katana: 747474,
  monad: 143,
  morph: 2818,
  sonic: 146,
  stable: 988,
  swell: 1923,
  tac: 239,
  bob: 60808,
  megaeth: 4326,
  // Testnets:
  avalancheFuji: 43113,
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
  ...(featureConfig.isAvalancheEnabled
    ? { [ChainId.avalanche]: avalanche }
    : {}),
  [ChainId.base]: base,
  [ChainId.berachain]: berachain,
  [ChainId.binanceSmartChain]: bsc,
  [ChainId.corn]: corn,
  [ChainId.etherlink]: etherlink,
  [ChainId.katana]: katana,
  ...(featureConfig.isMonadEnabled ? { [ChainId.monad]: monad } : {}),
  [ChainId.morph]: morph,
  [ChainId.sonic]: sonic,
  [ChainId.stable]: stable,
  [ChainId.swell]: swellchain,
  [ChainId.tac]: tac,
  [ChainId.bob]: bob,
  [ChainId.megaeth]: megaeth,
  // Testnets:
  ...(featureConfig.isAvalancheEnabled
    ? { [ChainId.avalancheFuji]: avalancheFuji }
    : {}),
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
type MonadChain = typeof ChainId.monad;
export const isMonadChain = (chainId: unknown): chainId is MonadChain => {
  return chainId === ChainId.monad;
};

type EthereumChain = typeof ChainId.ethereum;
export const isEthereumChain = (chainId: unknown): chainId is EthereumChain => {
  return ([ChainId.ethereum] as number[]).includes(chainId as number);
};

type StableChain = typeof ChainId.stable;
export const isStableChain = (chainId: unknown): chainId is StableChain => {
  return chainId === ChainId.stable;
};

type MegaethChain = typeof ChainId.megaeth;
export const isMegaethChain = (chainId: unknown): chainId is MegaethChain => {
  return ([ChainId.megaeth] as number[]).includes(chainId as number);
};
export const CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP = {
  [ChainId.ethereum]: 'ethereum',
  ...(featureConfig.isAvalancheEnabled
    ? { [ChainId.avalanche]: 'avalanche' }
    : {}),
  [ChainId.base]: 'base',
  [ChainId.berachain]: 'berachain',
  [ChainId.binanceSmartChain]: 'bsc',
  [ChainId.corn]: 'corn',
  [ChainId.etherlink]: 'etherlink',
  [ChainId.morph]: 'morph',
  [ChainId.sonic]: 'sonic',
  [ChainId.swell]: 'swellchain',
  [ChainId.megaeth]: 'megaeth',
  [ChainId.monad]: 'monad',
} as const;
type LlamaChain =
  (typeof CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP)[keyof typeof CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP];

export function isValidChain(chainId: unknown): chainId is ChainId {
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

  const chain = CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId];

  if (!chain) {
    throw new Error(`Chain ${chainId} not found`);
  }

  await viem_addChain(walletClient, {
    chain,
  });
}
export const getLlamaChainName = (chainId: ChainId): LlamaChain | undefined => {
  const name =
    CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP[
      chainId as keyof typeof CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP
    ];
  return name;
};

export const getChain = (chainId: number): viem_chains.Chain | undefined =>
  extractChain({ chains: Object.values(allChains), id: chainId as ChainId });
