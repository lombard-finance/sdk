/**
 * Token Address Constants
 *
 * @deprecated v4.1 Migration Target
 *
 * This module contains hardcoded token addresses. For v4.1, these should be
 * migrated to use the Asset Catalog (`core/assets/`) which supports dynamic
 * address loading from remote sources.
 *
 * See: docs/ADDRESS_SYSTEM_UNIFICATION.md
 *
 * Current usage (~26 files) should migrate to:
 * - `getAssetAddress()` from `core/assets/utils`
 * - Pass `catalog` from `ResolvedLombardConfig`
 *
 * @module tokens/token-addresses
 */

import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { Address } from 'viem';

import {
  ChainId,
  isSolanaChain,
  isStarknetChainId,
  isSuiChain,
  isValidChain,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SolanaChain,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  StarknetChainId,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
  SuiChain,
} from '../common/chains';
import { featureConfig } from '../common/feature-config';
import { AddressKind, BridgeTokenAddresses } from './types';

// Re-export for backward compatibility
export type { BridgeTokenAddresses } from './types';
export { AddressKind } from './types';

export enum Token {
  // Lombard tokens:
  /** LBTC: the yield-bearing token */
  LBTC = 'LBTC',
  /**
   * BTCK: the native LBTC token on Katana chain
   * @deprecated - Switch to {@link Token.BTCb} as soon as the BTCK becomes obsolete.
   */
  BTCK = 'BTCK',
  /** BTC.b: the native Lombard's BTC wrapper token */
  BTCb = 'BTC.b',

  // Supporting tokens:
  BTCBinance = 'BTCB',
  cbBTC = 'cbBTC',
  eBTC = 'eBTC',
  wBTC = 'wBTC',
  wBTCN = 'wBTCN',
}

type SupportingToken =
  | Token.BTCBinance
  | Token.cbBTC
  | Token.eBTC
  | Token.wBTC
  | Token.wBTCN;

export type RatioToken = 'TOKEN_SYMBOL_STLBTC';
export const RATIO_TOKEN_MAP: Record<RatioToken, Token> = {
  TOKEN_SYMBOL_STLBTC: Token.LBTC,
};

export type TokenAddressesPerEnv<
  token extends Token,
  chain extends string | number | symbol = ChainId | SuiChain | SolanaChain,
> = Partial<
  Record<
    Env,
    Partial<
      Record<
        chain,
        | (token extends Token.BTCb
            ? chain extends
                | typeof ChainId.avalanche
                | typeof ChainId.avalancheFuji
              ? BridgeTokenAddresses
              : Address
            : chain extends ChainId | SuiChain | StarknetChainId
              ? Address
              : string)
        | undefined
      >
    >
  >
>;

export type TokenAddresses<
  token extends Token,
  chain extends string | number | symbol = ChainId | SuiChain | SolanaChain,
> = Partial<Record<token, TokenAddressesPerEnv<token, chain>>>;

/**
 * BTC.b token addresses across different chains and environments.
 *
 * **Architecture:**
 * - On **Avalanche chains** (Avalanche Mainnet, Avalanche Fuji): Uses dual-contract architecture
 *   with both `token` and `adapter` addresses
 * - On **other chains** (Katana, Sepolia, BSC, etc.): Uses single address
 *
 * **Address Usage:**
 * - `token`: BTC.b ERC20 contract - use for permits, balance queries, standard ERC20 operations
 * - `adapter`: BridgeTokenAdapter contract - use for bridge operations, burn/mint/transfer
 *
 * @example
 * ```typescript
 * // Avalanche Fuji (testnet) has dual addresses:
 * const addresses = EVM_BTCB_ADDRESSES[Env.testnet][ChainId.avalancheFuji];
 * // { token: '0xB14f240...', adapter: '0x41BCd71...' }
 *
 * ```
 */
const EVM_BTCB_ADDRESSES: TokenAddressesPerEnv<Token.BTCb, ChainId> = {
  [Env.prod]: {
    [ChainId.ethereum]: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
    [ChainId.katana]: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
    ...(featureConfig.isAvalancheMainnetEnabled
      ? {
          [ChainId.avalanche]: {
            token: '0x152b9d0FdC40C096757F570A51E494bd4b943E50',
            adapter: '0x85D1D52e11290F174444d21C2a167bEDBE36e4d2',
          },
        }
      : {}),
    ...(featureConfig.isMonadEnabled
      ? {
          [ChainId.monad]: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
        }
      : {}),
    [ChainId.megaeth]: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
    [ChainId.stable]: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
  },
  [Env.ibc]: {
    ...(featureConfig.isAvalancheFujiEnabled
      ? {
          [ChainId.avalancheFuji]: {
            adapter: '0x1391f9AC408cf13214DDB71d359002658eaF9ebb',
            token: '0x71ba2b8dc58e7ca1b6d81a60729e31aefa37ae02',
          },
        }
      : {}),
  },
  [Env.dev]: {
    ...(featureConfig.isAvalancheFujiEnabled
      ? {
          [ChainId.avalancheFuji]: {
            adapter: '0x0A65C37d07c32E5eA8ea40495b7f249cdE26935e',
            token: '0x7FbdC44BfEBDe80C970ba622B678daB36cee31f6',
          },
        }
      : {}),
    [ChainId.binanceSmartChainTestnet]:
      '0xea3F66E5f2928dB9673103BfA01a2153A57a8050',
    [ChainId.sepolia]: '0x195219A262423d209E126BD21cf4F4F9AA796927',
  },
  [Env.stage]: {
    ...(featureConfig.isAvalancheFujiEnabled
      ? {
          [ChainId.avalancheFuji]: {
            adapter: '0x0A65C37d07c32E5eA8ea40495b7f249cdE26935e',
            token: '0x7FbdC44BfEBDe80C970ba622B678daB36cee31f6',
          },
        }
      : {}),
    [ChainId.sepolia]: '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58',
  },
  [Env.testnet]: {
    ...(featureConfig.isAvalancheFujiEnabled
      ? {
          [ChainId.avalancheFuji]: {
            adapter: '0x41BCd71e7C92b1c8dDe53037F9b2c4AA2058b1cB',
            token: '0xB14f240714Bd23Bda103A7189D512A90326E4D01',
          },
        }
      : {}),
    [ChainId.sepolia]: '0x20eA7b8ABb4B583788F1DFC738C709a2d9675681',
  },
};

export const EVM_LBTC_ADDRESSES: TokenAddressesPerEnv<Token.LBTC, ChainId> = {
  [Env.prod]: {
    [ChainId.ethereum]: '0x8236a87084f8b84306f72007f36f2618a5634494',
    ...(featureConfig.isAvalancheMainnetEnabled
      ? {
          [ChainId.avalanche]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
        }
      : {}),
    [ChainId.base]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.berachain]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.binanceSmartChain]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.etherlink]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.katana]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.megaeth]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.morph]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.sonic]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.stable]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.swell]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.tac]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
    [ChainId.bob]: '0xA45d4121b3D47719FF57a947A9d961539Ba33204',
    ...(featureConfig.isMonadEnabled
      ? {
          [ChainId.monad]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
        }
      : {}),
  },
  [Env.stage]: {
    ...(featureConfig.isAvalancheFujiEnabled
      ? {
          [ChainId.avalancheFuji]: undefined,
        }
      : {}),
    [ChainId.baseSepoliaTestnet]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
    [ChainId.berachainBartioTestnet]:
      '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
    [ChainId.binanceSmartChainTestnet]:
      '0x731eFa688F3679688cf60A3993b8658138953ED6',
    [ChainId.holesky]: '0xED7bfd5C1790576105Af4649817f6d35A75CD818',
    [ChainId.sepolia]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
    [ChainId.sonicBlazeTestnet]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
  },
  [Env.testnet]: {
    ...(featureConfig.isAvalancheFujiEnabled
      ? {
          [ChainId.avalancheFuji]: '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
        }
      : {}),
    [ChainId.baseSepoliaTestnet]: '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
    [ChainId.berachainBartioTestnet]:
      '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
    [ChainId.binanceSmartChainTestnet]:
      '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
    [ChainId.holesky]: '0x38A13AB20D15ffbE5A7312d2336EF1552580a4E2',
    [ChainId.sepolia]: '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
    [ChainId.sonicBlazeTestnet]: '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
  },
  [Env.dev]: {
    ...(featureConfig.isAvalancheFujiEnabled
      ? {
          [ChainId.avalancheFuji]: '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
        }
      : {}),
    [ChainId.sepolia]: '0x93283b6B889C591893dB0dc93baD71656D5d8923',
    [ChainId.baseSepoliaTestnet]: '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
    [ChainId.berachainBartioTestnet]:
      '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
    [ChainId.binanceSmartChainTestnet]:
      '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
  },
};

const EVM_SUPPORTING_TOKEN_ADDRESSES: TokenAddresses<SupportingToken, ChainId> =
  {
    [Token.BTCBinance]: {
      [Env.prod]: {
        [ChainId.binanceSmartChain]:
          '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
      },
    },
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
  };

export const TOKEN_ADDRESSES: TokenAddresses<Token, ChainId> = {
  [Token.LBTC]: EVM_LBTC_ADDRESSES,
  [Token.BTCb]: EVM_BTCB_ADDRESSES,
  [Token.BTCK]: EVM_BTCB_ADDRESSES, // alias for NativeLBTC
  ...EVM_SUPPORTING_TOKEN_ADDRESSES,
};

export const SUI_TOKEN_ADDRESSES: TokenAddresses<Token.LBTC, SuiChain> = {
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

export const SOLANA_TOKEN_ADDRESSES: TokenAddresses<
  Token.LBTC | Token.BTCb,
  SolanaChain
> = {
  [Token.LBTC]: {
    [Env.prod]: {
      [SOLANA_MAINNET_CHAIN]: 'LBTCgU4b3wsFKsPwBn1rRZDx5DoFutM6RPiEt1TPDsY',
    },
    [Env.testnet]: {
      [SOLANA_DEVNET_CHAIN]: '1BTCPX3qyFtBvhQvJaHntfzZfB8qcJmJXfoRnD3vAgh',
    },
    [Env.dev]: {
      [SOLANA_DEVNET_CHAIN]: 'LBTCojyVJ63rsEED2DLEGWMzSxWJyQynXE91LMLgV1J',
    },
    [Env.stage]: {
      [SOLANA_DEVNET_CHAIN]: '1btcyoWK7d99iosES4eXQGhhooCscKGigV5wHfvzueX',
    },
  },
  [Token.BTCb]: {
    [Env.prod]: {
      [SOLANA_MAINNET_CHAIN]: 'BTCbKVgfW4xMqTWEmxVwc6pzg2c5YtQWxSpBuQDhUrpu',
    },
    [Env.dev]: {
      [SOLANA_DEVNET_CHAIN]: 'BTCB3ripBAut19jM8kDPVbJHb2ZdR2GcZvGZkCmFPtV8',
    },
    [Env.stage]: {
      [SOLANA_DEVNET_CHAIN]: 'BTCGPAHQSsS9RYcL2Z4B5z6YyAXLatNcnaEwYdczsMZw',
    },
    [Env.testnet]: {
      [SOLANA_DEVNET_CHAIN]: 'BTCb1Xy55DzwPMog9d3ztPau4nqXp6BhUrdGHjTrMYCn',
    },
  },
};

export const getSolanaTokenAddress = (
  chainId: SolanaChain,
  env = DEFAULT_ENV,
  token: Token.LBTC | Token.BTCb = Token.LBTC,
): string | undefined => {
  return SOLANA_TOKEN_ADDRESSES[token]?.[env]?.[chainId] || undefined;
};

export const getTokenByAddress = (
  tokenAddress?: string,
  chainId?: ChainId | SuiChain | SolanaChain | StarknetChainId,
  env = DEFAULT_ENV,
  addressKind: AddressKind = AddressKind.Token,
) => {
  if (!tokenAddress || !chainId) return;

  const detectableTokens = [Token.LBTC, Token.BTCb];

  const addressMaps = [
    [isStarknetChainId, STARKNET_TOKEN_ADDRESSES],
    [isSuiChain, SUI_TOKEN_ADDRESSES],
    [isSolanaChain, SOLANA_TOKEN_ADDRESSES],
    [isValidChain, TOKEN_ADDRESSES],
  ] as const;

  for (const token of detectableTokens) {
    for (const [checkChain, addresses] of addressMaps) {
      if (checkChain(chainId)) {
        let address = (
          addresses as TokenAddresses<typeof token, typeof chainId>
        )?.[token]?.[env]?.[chainId];
        if (address) {
          address =
            typeof address === 'string' ? address : address[addressKind];
          if (tokenAddress.toLowerCase() === address.toLowerCase())
            return token;
        }
      }
    }
  }
};

export const getTokenAddressForChain = (
  chainId: ChainId | SuiChain | SolanaChain | StarknetChainId,
  adapter: AddressKind = AddressKind.Token,
  env: Env = DEFAULT_ENV,
): string | undefined => {
  if (isValidChain(chainId)) {
    const found = TOKEN_ADDRESSES[Token.LBTC]?.[env]?.[chainId];
    if (found) {
      return typeof found === 'string' ? found : found[adapter];
    }
  }
  if (isSuiChain(chainId)) {
    return SUI_TOKEN_ADDRESSES[Token.LBTC]?.[env]?.[chainId];
  }
  if (isSolanaChain(chainId)) {
    return SOLANA_TOKEN_ADDRESSES[Token.LBTC]?.[env]?.[chainId];
  }
  if (isStarknetChainId(chainId)) {
    return STARKNET_TOKEN_ADDRESSES[Token.LBTC]?.[env]?.[chainId];
  }
  return undefined;
};

// Starknet token addresses
// See: packages/sdk-starknet/src/tokens/lib/tokens.ts
export const STARKNET_TOKEN_ADDRESSES: TokenAddresses<
  Token.LBTC,
  StarknetChainId
> = {
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

export const STARKNET_ASSET_ROUTER_ADDRESSES: TokenAddresses<
  Token.LBTC,
  StarknetChainId
> = {
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
