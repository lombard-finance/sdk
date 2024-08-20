import { defaultEnv } from '../common/const';
import { OChainId, TChainId, TEnv } from '../common/types/types';

type LbtcTokenConfig = Partial<Record<TChainId, string>>;

const testnetConfig: LbtcTokenConfig = {
  [OChainId.holesky]: '0xED7bfd5C1790576105Af4649817f6d35A75CD818',
};

const mainnetConfig: LbtcTokenConfig = {
  [OChainId.ethereum]: '0x8236a87084f8b84306f72007f36f2618a5634494',
};

export function getLbtcAddressConfig(env: TEnv = defaultEnv): LbtcTokenConfig {
  return env === 'prod' ? mainnetConfig : testnetConfig;
}
