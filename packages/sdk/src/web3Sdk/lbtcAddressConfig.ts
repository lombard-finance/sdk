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
};

const testnetConfig: LbtcTokenConfig = {
  [OChainId.holesky]: '0x38A13AB20D15ffbE5A7312d2336EF1552580a4E2',
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,

  [OChainId.binanceSmartChainTestnet]:
    '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
  [OChainId.binanceSmartChain]: PLACEHOLDER_ADDRESS,
};

const prodConfig: LbtcTokenConfig = {
  [OChainId.holesky]: PLACEHOLDER_ADDRESS,
  [OChainId.ethereum]: '0x8236a87084f8b84306f72007f36f2618a5634494',

  [OChainId.binanceSmartChainTestnet]: PLACEHOLDER_ADDRESS,
  [OChainId.binanceSmartChain]: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
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
