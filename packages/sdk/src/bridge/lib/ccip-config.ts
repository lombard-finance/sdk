import { ChainId } from '../../common/chains';
import { Address } from 'viem';

export type CCIPChainConfig = {
  routerAddress: Address;
  chainSelector: string;
};

type CCIPConfig = Record<number, CCIPChainConfig>;

export const CCIP_CONFIG: CCIPConfig = {
  [ChainId.ethereum]: {
    routerAddress: '0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D',
    chainSelector: '5009297550715157269',
  },
  [ChainId.base]: {
    routerAddress: '0x881e3A65B4d4a04dD529061dd0071cf975F58bCD',
    chainSelector: '15971525489660198786',
  },
  [ChainId.binanceSmartChain]: {
    routerAddress: '0x34B03Cb9086d7D758AC55af71584F81A598759FE',
    chainSelector: '11344663589394136015',
  },
  [ChainId.sonic]: {
    routerAddress: '0xB4e1Ff7882474BB93042be9AD5E1fA387949B860',
    chainSelector: '1673871237479749969',
  },
  [ChainId.katana]: {
    routerAddress: '0x7c19b79D2a054114Ab36ad758A36e92376e267DA',
    chainSelector: '2459028469735686113',
  },
  // Testnets
  [ChainId.holesky]: {
    routerAddress: '0xb9531b46fE8808fB3659e39704953c2B1112DD43',
    chainSelector: '7717148896336251131',
  },
  [ChainId.baseSepoliaTestnet]: {
    routerAddress: '0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93',
    chainSelector: '10344971235874465080',
  },
  [ChainId.binanceSmartChainTestnet]: {
    routerAddress: '0xE1053aE1857476f36A3C62580FF9b016E8EE8F6f',
    chainSelector: '13264668187771770619',
  },
  [ChainId.katanaTatara]: {
    routerAddress: '0x1dF1fe714A376f248d51AAB826C3feeC379e80fC',
    chainSelector: '9090863410735740267',
  },
};

export function getCCIPConfig(chainId: ChainId): CCIPChainConfig | undefined {
  return CCIP_CONFIG[chainId];
}
