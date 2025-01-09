import {
  defaultEnv,
  ZERO_ADDRESS as PLACEHOLDER_ADDRESS,
} from '../common/const';
import { OChainId, OEnv, TChainId, TEnv } from '../common/types/types';

type LbtcTokenConfig = Record<TChainId, string>;

const stageConfig: LbtcTokenConfig = {
  [OChainId.holesky]: '0xED7bfd5C1790576105Af4649817f6d35A75CD818',
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,

  [OChainId.binanceSmartChainTestnet]:
    '0x731eFa688F3679688cf60A3993b8658138953ED6',
  [OChainId.binanceSmartChain]: PLACEHOLDER_ADDRESS,
  [OChainId.sepolia]: '0xc47e4b3124597fdf8dd07843d4a7052f2ee80c30',

  [OChainId.base]: PLACEHOLDER_ADDRESS,
  [OChainId.baseSepoliaTestnet]: '0x731eFa688F3679688cf60A3993b8658138953ED6',
  
  [OChainId.berachainBartioTestnet]:
    '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',

  [OChainId.corn]: PLACEHOLDER_ADDRESS,
  [OChainId.swell]: PLACEHOLDER_ADDRESS,
};

const testnetConfig: LbtcTokenConfig = {
  [OChainId.holesky]: '0x38A13AB20D15ffbE5A7312d2336EF1552580a4E2',
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,

  [OChainId.binanceSmartChainTestnet]:
    '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
  [OChainId.binanceSmartChain]: PLACEHOLDER_ADDRESS,
  [OChainId.sepolia]: '0xc47e4b3124597fdf8dd07843d4a7052f2ee80c30',

  [OChainId.base]: PLACEHOLDER_ADDRESS,
  [OChainId.baseSepoliaTestnet]: PLACEHOLDER_ADDRESS,
  [OChainId.berachainBartioTestnet]:
    '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',

  [OChainId.corn]: PLACEHOLDER_ADDRESS,
  [OChainId.swell]: PLACEHOLDER_ADDRESS,
};

const prodConfig: LbtcTokenConfig = {
  [OChainId.ethereum]: '0x8236a87084f8b84306f72007f36f2618a5634494',
  [OChainId.holesky]: PLACEHOLDER_ADDRESS,
  [OChainId.sepolia]: PLACEHOLDER_ADDRESS,

  [OChainId.binanceSmartChainTestnet]: PLACEHOLDER_ADDRESS,
  [OChainId.binanceSmartChain]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',

  [OChainId.base]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  [OChainId.baseSepoliaTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.berachainBartioTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.corn]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
  [OChainId.swell]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
};

export function getLbtcAddressConfig(env: TEnv = defaultEnv): LbtcTokenConfig {
  switch (env) {
    case OEnv.prod:
      return prodConfig;
    case OEnv.testnet:
      return testnetConfig;
    default:
      return stageConfig;
  }
}
