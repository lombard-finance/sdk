import { Env } from '@lombard.finance/sdk-common';
import { Address } from 'viem';
import { ChainId } from '../common/chains';

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

type TokenAddresses = Partial<
  Record<
    Token,
    Partial<Record<Env, Partial<Record<ChainId, Address | undefined>>>>
  >
>;

export const TOKEN_ADDRESSES: TokenAddresses = {
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
      [ChainId.sepolia]: '0xc47e4b3124597fdf8dd07843d4a7052f2ee80c30',
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
  [Token.NativeLBTC]: {
    [Env.dev]: {
      [ChainId.binanceSmartChainTestnet]:
        '0xea3F66E5f2928dB9673103BfA01a2153A57a8050',
      [ChainId.sepolia]: '0x195219A262423d209E126BD21cf4F4F9AA796927',
    },
    [Env.stage]: {
      [ChainId.sepolia]: '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58',
    },
  },
  [Token.BTCK]: {
    [Env.prod]: {
      [ChainId.katana]: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
      [ChainId.katanaTatara]: undefined,
    },
    [Env.stage]: {
      [ChainId.katana]: undefined,
      [ChainId.katanaTatara]: '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58',
    },
    [Env.testnet]: {
      [ChainId.katana]: undefined,
      [ChainId.katanaTatara]: '0x20eA7b8ABb4B583788F1DFC738C709a2d9675681',
    },
    [Env.dev]: {
      [ChainId.katana]: undefined,
      [ChainId.katanaTatara]: '0xA74D838817f3098166d74a141b7d241efB15F42c',
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
  [Token.wBTCN]: {
    [Env.prod]: {
      [ChainId.corn]: '0xda5dDd7270381A7C2717aD10D1c0ecB19e3CDFb2',
    },
  },
};
