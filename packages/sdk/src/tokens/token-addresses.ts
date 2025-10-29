import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { Address } from 'viem';
import {
  ChainId,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
  SolanaChain,
  SuiChain,
  StarknetChainId,
  STARKNET_SEPOLIA_CHAIN,
  STARKNET_MAINNET_CHAIN,
} from '../common/chains';

export enum Token {
  // Lombard tokens:
  /** LBTC: the yield-bearing token */
  LBTC = 'LBTC',
  /** BTCK: the native LBTC token on Katana chain */
  BTCK = 'BTCK',
  /** (name pending): the native LBTC token */
  NativeLBTC = 'NativeLBTC',

  // Supporting tokens:
  BTCB = 'BTCB',
  cbBTC = 'cbBTC',
  eBTC = 'eBTC',
  wBTC = 'wBTC',
  wBTCN = 'wBTCN',
}

export type RatioToken = 'TOKEN_SYMBOL_STLBTC';
export const RATIO_TOKEN_MAP: Record<RatioToken, Token> = {
  TOKEN_SYMBOL_STLBTC: Token.LBTC,
};

type TokenAddressesPerEnv<
  chain extends string | number | symbol = ChainId | SuiChain | SolanaChain,
> = Partial<
  Record<
    Env,
    Partial<
      Record<
        chain,
        | (chain extends ChainId | SuiChain | StarknetChainId
            ? Address
            : string)
        | undefined
      >
    >
  >
>;

type TokenAddresses<
  chain extends string | number | symbol = ChainId | SuiChain | SolanaChain,
> = Partial<Record<Token, TokenAddressesPerEnv<chain>>>;

const EVM_NATIVE_LBTC_ADDRESSES: TokenAddressesPerEnv<ChainId> = {
  [Env.prod]: {
    [ChainId.katana]: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
  },
  [Env.dev]: {
    [ChainId.binanceSmartChainTestnet]:
      '0xea3F66E5f2928dB9673103BfA01a2153A57a8050',
    [ChainId.sepolia]: '0x195219A262423d209E126BD21cf4F4F9AA796927',
    [ChainId.katanaTatara]: '0xA74D838817f3098166d74a141b7d241efB15F42c',
  },
  [Env.stage]: {
    [ChainId.sepolia]: '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58',
    [ChainId.katanaTatara]: '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58',
  },
  [Env.testnet]: {
    [ChainId.katanaTatara]: '0x20eA7b8ABb4B583788F1DFC738C709a2d9675681',
  },
};

export const TOKEN_ADDRESSES: TokenAddresses<ChainId> = {
  [Token.LBTC]: {
    [Env.prod]: {
      [ChainId.ethereum]: '0x8236a87084f8b84306f72007f36f2618a5634494',
      [ChainId.base]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.berachain]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.binanceSmartChain]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.corn]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.etherlink]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.katana]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.morph]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.sonic]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.swell]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.tac]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
      [ChainId.bob]: '0xA45d4121b3D47719FF57a947A9d961539Ba33204',
    },
    [Env.stage]: {
      [ChainId.baseSepoliaTestnet]:
        '0x731eFa688F3679688cf60A3993b8658138953ED6',
      [ChainId.berachainBartioTestnet]:
        '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
      [ChainId.binanceSmartChainTestnet]:
        '0x731eFa688F3679688cf60A3993b8658138953ED6',
      [ChainId.holesky]: '0xED7bfd5C1790576105Af4649817f6d35A75CD818',
      // https://github.com/lombard-finance/smart-contracts/blob/2-token-model/devnet.json
      [ChainId.katanaTatara]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
      [ChainId.sepolia]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
      [ChainId.sonicBlazeTestnet]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
    },
    [Env.testnet]: {
      [ChainId.berachainBartioTestnet]:
        '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
      [ChainId.binanceSmartChainTestnet]:
        '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
      [ChainId.holesky]: '0x38A13AB20D15ffbE5A7312d2336EF1552580a4E2',
      [ChainId.sepolia]: '0xc47e4b3124597fdf8dd07843d4a7052f2ee80c30',
      [ChainId.sonicBlazeTestnet]: '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
      [ChainId.katanaTatara]: '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
      [ChainId.baseSepoliaTestnet]:
        '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
    },
    [Env.dev]: {
      // https://github.com/lombard-finance/smart-contracts/blob/2-token-model/devnet-bft.json
      [ChainId.sepolia]: '0x93283b6B889C591893dB0dc93baD71656D5d8923',
      [ChainId.baseSepoliaTestnet]:
        '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
      [ChainId.berachainBartioTestnet]:
        '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
      [ChainId.binanceSmartChainTestnet]:
        '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
      [ChainId.katanaTatara]: '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
    },
  },
  [Token.BTCB]: {
    [Env.prod]: {
      [ChainId.binanceSmartChain]: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    },
  },
  [Token.NativeLBTC]: EVM_NATIVE_LBTC_ADDRESSES,
  [Token.BTCK]: EVM_NATIVE_LBTC_ADDRESSES, // alias for NativeLBTC, TODO: Remove once apps are moved to the Token.NativeLBTC
  [Token.eBTC]: {
    [Env.prod]: {
      [ChainId.ethereum]: '0x657e8c867d8b37dcc18fa4caead9c45eb088c642',
    },
  },
  [Token.wBTC]: {
    [Env.prod]: {
      [ChainId.ethereum]: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    },
  },
  [Token.wBTCN]: {
    [Env.prod]: {
      [ChainId.corn]: '0xda5dDd7270381A7C2717aD10D1c0ecB19e3CDFb2',
    },
  },
};

export const SUI_TOKEN_ADDRESSES: TokenAddresses<SuiChain> = {
  [Token.LBTC]: {
    [Env.prod]: {
      [SUI_MAINNET_CHAIN]:
        '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040',
    },
    [Env.stage]: {
      [SUI_TESTNET_CHAIN]:
        '0x2d66430a27565b912f21be970e5ae1e8c0359f0b518c3235b751c75976791ce0',
    },
    [Env.testnet]: {
      [SUI_TESTNET_CHAIN]:
        '0x50454d0b0fbad1288a6ab74f2e8ce0905a3317870673ab7787ebcf6f322b45fa',
    },
  },
};

export const getSuiTokenAddress = (
  chainId: SuiChain,
  env = DEFAULT_ENV,
): Address | undefined => {
  return SUI_TOKEN_ADDRESSES[Token.LBTC]?.[env]?.[chainId] || undefined;
};

export const SOLANA_TOKEN_ADDRESSES: TokenAddresses<SolanaChain> = {
  [Token.LBTC]: {
    [Env.prod]: {
      [SOLANA_MAINNET_CHAIN]: 'LomP48F7bLbKyMRHHsDVt7wuHaUQvQnVVspjcbfuAek',
    },
    [Env.testnet]: {
      [SOLANA_TESTNET_CHAIN]: '79cscM6J9Af24TGGWcXyDf56fDLoodkyXdVy4R9aZ6C6',
    },
    [Env.stage]: {
      [SOLANA_DEVNET_CHAIN]: 'HEY7PCJe3GB27UWdopuYb1xDbB5SNtTcYPxRjntvfBSA',
    },
  },
};

export const getSolanaTokenAddress = (
  chainId: SolanaChain,
  env = DEFAULT_ENV,
): string | undefined => {
  return SOLANA_TOKEN_ADDRESSES[Token.LBTC]?.[env]?.[chainId] || undefined;
};

// Starknet token addresses
// See: packages/sdk-starknet/src/tokens/lib/tokens.ts
export const STARKNET_TOKEN_ADDRESSES: TokenAddresses<StarknetChainId> = {
  [Token.LBTC]: {
    [Env.prod]: {
      [STARKNET_SEPOLIA_CHAIN]: undefined,
      [STARKNET_MAINNET_CHAIN]:
        '0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4',
    },
    [Env.stage]: {
      [STARKNET_SEPOLIA_CHAIN]:
        '0x00b442f5420860e937a99659326e81a97e07bfd538b3cee65b90029c9da38a5f',
      [STARKNET_MAINNET_CHAIN]: undefined,
    },
    [Env.testnet]: {
      [STARKNET_SEPOLIA_CHAIN]:
        '0x00456a829ab75ba5e97534dc70d7fc617cfda244f8dcda47b11624de67c6e70c',
      [STARKNET_MAINNET_CHAIN]: undefined,
    },
    [Env.dev]: {
      [STARKNET_SEPOLIA_CHAIN]:
        '0x0723de0c550b7bfbb5051dade72966d71a08bef952c0197462a5244497eb57c1',
      [STARKNET_MAINNET_CHAIN]: undefined,
    },
  },
} as const;

export const STARKNET_ASSET_ROUTER_ADDRESSES: TokenAddresses<StarknetChainId> =
  {
    [Token.LBTC]: {
      [Env.prod]: {
        [STARKNET_SEPOLIA_CHAIN]: undefined,
        [STARKNET_MAINNET_CHAIN]:
          '0x05b1886d0f844ab930fc0ee066f1655a873437f15a5d2c41ee3e884fd5299976',
      },
      [Env.stage]: {
        [STARKNET_SEPOLIA_CHAIN]:
          '0x01d27f156092746d0d7cd9d9deec5e937f27c3c7c1c28365e9e5efac459880b3',
        [STARKNET_MAINNET_CHAIN]: undefined,
      },
      [Env.testnet]: {
        [STARKNET_SEPOLIA_CHAIN]:
          '0x063b7b5c8b114ebd5b9602fbd5d0ffd2cc3a598f1d91c6904cc0997cd8fea760',
        [STARKNET_MAINNET_CHAIN]: undefined,
      },
      [Env.dev]: {
        [STARKNET_SEPOLIA_CHAIN]:
          '0x04838a05c798dc57e01e85526979841c84f1f3c732a525cff53adb3e8bee3d24',
        [STARKNET_MAINNET_CHAIN]: undefined,
      },
    },
  } as const;

export const getStarknetTokenAddress = (
  chainId: StarknetChainId,
  env = DEFAULT_ENV,
  variant: 'token' | 'assetRouter' = 'token',
): Address | undefined => {
  return (
    (variant === 'token'
      ? STARKNET_TOKEN_ADDRESSES
      : STARKNET_ASSET_ROUTER_ADDRESSES)[Token.LBTC]?.[env]?.[chainId] ||
    undefined
  );
};
