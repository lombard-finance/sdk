import {
  defaultEnv,
  ZERO_ADDRESS as PLACEHOLDER_ADDRESS,
} from '../common/const';
import { OChainId, OEnv, TChainId, TEnv } from '../common/types/types';

type BasculeTokenConfig = Record<TChainId, string>;

const stageConfig: BasculeTokenConfig = {
  [OChainId.holesky]: '0x3a0c40c84b5034ed9a98a9a47a02af2b0885246f',
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,

  [OChainId.binanceSmartChainTestnet]: PLACEHOLDER_ADDRESS,
  [OChainId.binanceSmartChain]: PLACEHOLDER_ADDRESS,

  [OChainId.base]: PLACEHOLDER_ADDRESS,
  [OChainId.baseSepoliaTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.berachainBartioTestnet]: PLACEHOLDER_ADDRESS,
  [OChainId.sepolia]: PLACEHOLDER_ADDRESS,
  [OChainId.corn]: PLACEHOLDER_ADDRESS,

  [OChainId.swell]: PLACEHOLDER_ADDRESS,

  [OChainId.morph]: PLACEHOLDER_ADDRESS,
  [OChainId.morphHolesky]: PLACEHOLDER_ADDRESS,
};

const testnetConfig: BasculeTokenConfig = {
  [OChainId.holesky]: '0x3a0c40c84b5034ed9a98a9a47a02af2b0885246f',
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,

  [OChainId.binanceSmartChainTestnet]: PLACEHOLDER_ADDRESS,
  [OChainId.binanceSmartChain]: PLACEHOLDER_ADDRESS,

  [OChainId.base]: PLACEHOLDER_ADDRESS,
  [OChainId.baseSepoliaTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.berachainBartioTestnet]: PLACEHOLDER_ADDRESS,
  [OChainId.sepolia]: PLACEHOLDER_ADDRESS,
  [OChainId.corn]: PLACEHOLDER_ADDRESS,

  [OChainId.swell]: PLACEHOLDER_ADDRESS,

  [OChainId.morph]: PLACEHOLDER_ADDRESS,
  [OChainId.morphHolesky]: PLACEHOLDER_ADDRESS,
};

const prodConfig: BasculeTokenConfig = {
  [OChainId.holesky]: PLACEHOLDER_ADDRESS,
  [OChainId.ethereum]: '0xc750eCAC7250E0D18ecE2C7a5F130E3A765dc260',

  [OChainId.binanceSmartChainTestnet]: PLACEHOLDER_ADDRESS,
  [OChainId.binanceSmartChain]: PLACEHOLDER_ADDRESS,

  [OChainId.base]: PLACEHOLDER_ADDRESS,
  [OChainId.baseSepoliaTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.berachainBartioTestnet]: PLACEHOLDER_ADDRESS,
  [OChainId.sepolia]: PLACEHOLDER_ADDRESS,
  [OChainId.corn]: PLACEHOLDER_ADDRESS,
  [OChainId.swell]: PLACEHOLDER_ADDRESS,

  [OChainId.morph]: PLACEHOLDER_ADDRESS,
  [OChainId.morphHolesky]: PLACEHOLDER_ADDRESS,
};

export function getBasculeAddressConfig(
  env: TEnv = defaultEnv,
): BasculeTokenConfig {
  switch (env) {
    case OEnv.prod:
      return prodConfig;
    case OEnv.testnet:
      return testnetConfig;
    default:
      return stageConfig;
  }
}
