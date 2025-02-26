import { ZERO_ADDRESS as PLACEHOLDER_ADDRESS } from '../common/const';
import { OChainId, TChainId } from '../common/types/types';

import { Env, defaultEnv } from '@lombard.finance/sdk-common';

type BasculeTokenConfig = Record<TChainId, string>;

const stageConfig: BasculeTokenConfig = {
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,
  [OChainId.holesky]: '0x3a0c40c84b5034ed9a98a9a47a02af2b0885246f',
  [OChainId.sepolia]: PLACEHOLDER_ADDRESS,

  [OChainId.binanceSmartChain]: PLACEHOLDER_ADDRESS,
  [OChainId.binanceSmartChainTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.base]: PLACEHOLDER_ADDRESS,
  [OChainId.baseSepoliaTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.berachain]: PLACEHOLDER_ADDRESS,
  [OChainId.berachainBartioTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.corn]: PLACEHOLDER_ADDRESS,

  [OChainId.swell]: PLACEHOLDER_ADDRESS,

  [OChainId.sonic]: PLACEHOLDER_ADDRESS,
  [OChainId.morph]: PLACEHOLDER_ADDRESS,
  [OChainId.morphHolesky]: PLACEHOLDER_ADDRESS,
};

const testnetConfig: BasculeTokenConfig = {
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,
  [OChainId.holesky]: '0x3a0c40c84b5034ed9a98a9a47a02af2b0885246f',
  [OChainId.sepolia]: PLACEHOLDER_ADDRESS,

  [OChainId.binanceSmartChain]: PLACEHOLDER_ADDRESS,
  [OChainId.binanceSmartChainTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.base]: PLACEHOLDER_ADDRESS,
  [OChainId.baseSepoliaTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.berachain]: PLACEHOLDER_ADDRESS,
  [OChainId.berachainBartioTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.corn]: PLACEHOLDER_ADDRESS,

  [OChainId.swell]: PLACEHOLDER_ADDRESS,

  [OChainId.sonic]: PLACEHOLDER_ADDRESS,
  [OChainId.morph]: PLACEHOLDER_ADDRESS,
  [OChainId.morphHolesky]: PLACEHOLDER_ADDRESS,
};

const prodConfig: BasculeTokenConfig = {
  [OChainId.ethereum]: '0xc750eCAC7250E0D18ecE2C7a5F130E3A765dc260',
  [OChainId.holesky]: PLACEHOLDER_ADDRESS,
  [OChainId.sepolia]: PLACEHOLDER_ADDRESS,

  [OChainId.binanceSmartChain]: PLACEHOLDER_ADDRESS,
  [OChainId.binanceSmartChainTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.base]: PLACEHOLDER_ADDRESS,
  [OChainId.baseSepoliaTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.berachain]: PLACEHOLDER_ADDRESS,
  [OChainId.berachainBartioTestnet]: PLACEHOLDER_ADDRESS,

  [OChainId.corn]: PLACEHOLDER_ADDRESS,

  [OChainId.swell]: PLACEHOLDER_ADDRESS,

  [OChainId.sonic]: PLACEHOLDER_ADDRESS,
  [OChainId.morph]: PLACEHOLDER_ADDRESS,
  [OChainId.morphHolesky]: PLACEHOLDER_ADDRESS,
};

export function getBasculeAddressConfig(
  env: Env = defaultEnv,
): BasculeTokenConfig {
  switch (env) {
    case Env.prod:
      return prodConfig;
    case Env.testnet:
      return testnetConfig;
    default:
      return stageConfig;
  }
}
