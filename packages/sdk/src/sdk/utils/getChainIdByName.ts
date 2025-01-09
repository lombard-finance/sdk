import { defaultEnv } from '../../common/const';
import {
  getBaseNetworkByEnv,
  getBscNetworkByEnv,
  getEthNetworkByEnv,
  OChainId,
  TChainId,
  TEnv,
} from '../../common/types/types';
import { OChainName, TChainName } from '../internalTypes';

/**
 * @param chainId the chain ID
 *
 * @returns the chain name
 */
export function getChainIdByName(
  chain: string,
  env: TEnv = defaultEnv,
): TChainId {
  switch (chain as TChainName) {
    case OChainName.eth:
    case OChainName.ethOld:
      return getEthNetworkByEnv(env);

    case OChainName.base:
    case OChainName.baseOld:
      return getBaseNetworkByEnv(env);

    case OChainName.bsc:
    case OChainName.bscOld:
      return getBscNetworkByEnv(env);

    default:
      return OChainId.ethereum;
  }
}
