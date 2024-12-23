import { defaultEnv } from '../common/const';
import { OChainId, OEnv, TOFTChainId, TEnv } from '../common/types/types';

type TToChainId = Partial<Record<TOFTChainId, string>>;

type LbtcOFTAdapterConfig = Partial<Record<TOFTChainId, TToChainId>>;

const stageConfig: LbtcOFTAdapterConfig = {
  [OChainId.sepolia]: {
    [OChainId.berachainBartioTestnet]:
      '0xe3748bF0Ec0A76767539eE28610B3367e35fe2C2',
  },
  [OChainId.berachainBartioTestnet]: {
    [OChainId.sepolia]: '0x1977013acaf27856ac8048C42EE2ed0134d53895',
  },
};

const testnetConfig: LbtcOFTAdapterConfig = {
  ...stageConfig,
};

const prodConfig: LbtcOFTAdapterConfig = {
  ...stageConfig,
  [OChainId.corn]: {
    [OChainId.ethereum]: '0xfc7B20D9B59A8A466f4fC3d34aA69a7D98e71d7A',
  },
  [OChainId.ethereum]: {
    [OChainId.corn]: '0x6bc15d7930839ec18a57f6f7df72ae1b439d077f',
    [OChainId.swell]: '0x37E92d760a15231e652a2C502182a6b44c7510c0',
  },
  [OChainId.swell]: {
    [OChainId.ethereum]: '0x7B3784AD646C10A8Ddf42b47a4f4bd9aFD351E54',
  },
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
