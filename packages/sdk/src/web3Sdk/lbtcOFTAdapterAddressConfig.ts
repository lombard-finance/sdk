import { defaultEnv } from '../common/const';
import { OChainId, OEnv, TOFTChainId, TEnv } from '../common/types/types';

type LbtcOFTAdapterConfig = Record<TOFTChainId, string>;

const stageConfig: LbtcOFTAdapterConfig = {
  [OChainId.sepolia]: '0xe3748bF0Ec0A76767539eE28610B3367e35fe2C2',
  [OChainId.berachainBartioTestnet]:
    '0x1977013acaf27856ac8048C42EE2ed0134d53895',
};

const testnetConfig: LbtcOFTAdapterConfig = {
  ...stageConfig,
};

const prodConfig: LbtcOFTAdapterConfig = {
  ...stageConfig,
};

export function getLbtcOFTAdapterAddressConfig(
  env: TEnv = defaultEnv,
): LbtcOFTAdapterConfig {
  switch (env) {
    case OEnv.prod:
      return prodConfig;
    case OEnv.testnet:
      return testnetConfig;
    default:
      return stageConfig;
  }
}
