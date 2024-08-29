import {
  defaultEnv,
  ZERO_ADDRESS as PLACEHOLDER_ADDRESS,
} from '../common/const';
import { OChainId, OEnv, TChainId, TEnv } from '../common/types/types';

type LbtcTokenConfig = Record<TChainId, string>;

const stageConfig: LbtcTokenConfig = {
  [OChainId.holesky]: '0xED7bfd5C1790576105Af4649817f6d35A75CD818',
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,
};

const testnetConfig: LbtcTokenConfig = {
  [OChainId.holesky]: '0x38A13AB20D15ffbE5A7312d2336EF1552580a4E2',
  [OChainId.ethereum]: PLACEHOLDER_ADDRESS,
};

const prodConfig: LbtcTokenConfig = {
  [OChainId.holesky]: PLACEHOLDER_ADDRESS,
  [OChainId.ethereum]: '0x8236a87084f8b84306f72007f36f2618a5634494',
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
