import { Address } from 'viem';
import { ChainId } from '../common/chains';

export enum Token {
  LBTC = 'LBTC',
  BTCB = 'BTCB',
  cbBTC = 'cbBTC',
  eBTC = 'eBTC',
  wBTC = 'wBTC',
  wBTCN = 'wBTCN',
}

export const TOKEN_ADDRESSES: Partial<
  Record<Token, Partial<Record<ChainId, Address>>>
> = {
  [Token.BTCB]: {
    [ChainId.binanceSmartChain]: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  },
  [Token.cbBTC]: {
    [ChainId.ethereum]: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
    [ChainId.base]: '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf',
  },
  [Token.eBTC]: {
    [ChainId.ethereum]: '0x657e8c867d8b37dcc18fa4caead9c45eb088c642',
  },
  [Token.wBTC]: {
    [ChainId.ethereum]: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  },
  [Token.wBTCN]: {
    [ChainId.corn]: '0xda5dDd7270381A7C2717aD10D1c0ecB19e3CDFb2',
  },
};
