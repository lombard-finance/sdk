import {
  defaultEnv,
  ZERO_ADDRESS as PLACEHOLDER_ADDRESS,
} from '../common/const';
import { OChainId, OEnv, TOFTChainId, TEnv } from '../common/types/types';

type LbtcOFTAdapterConfig = Record<TOFTChainId, string>;

const stageConfig: LbtcOFTAdapterConfig = {
  [OChainId.sepolia]: '0xe3748bF0Ec0A76767539eE28610B3367e35fe2C2',
  [OChainId.berachainBartioTestnet]:
    '0x1977013acaf27856ac8048C42EE2ed0134d53895',
  [OChainId.corn]: PLACEHOLDER_ADDRESS,
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,
};

const testnetConfig: LbtcOFTAdapterConfig = {
  ...stageConfig,
};

const prodConfig: LbtcOFTAdapterConfig = {
  ...stageConfig,
  [OChainId.corn]: '0xfc7B20D9B59A8A466f4fC3d34aA69a7D98e71d7A',
  [OChainId.ethereum]: '0x6bc15d7930839ec18a57f6f7df72ae1b439d077f',
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
