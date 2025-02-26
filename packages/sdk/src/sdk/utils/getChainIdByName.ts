import { defaultEnv } from '@lombard.finance/sdk-common';
import {
  getBaseNetworkByEnv,
  getBscNetworkByEnv,
  getEthNetworkByEnv,
  getSuiNetworkByEnv,
  OChainId,
  TChainId,
} from '../../common/types/types';
import { Env } from '@lombard.finance/sdk-common';
import { OChainName, TChainName } from '../internalTypes';

/**
 * @param chain the chain ID
 * @param env
 * @returns the chain name
 */
export function getChainIdByName(
  chain: string,
  env: Env = defaultEnv,
): TChainId | 'sui:testnet' | 'sui:mainnet' | 'sui:devnet' | 'sui:localnet' {
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

    case OChainName.sui:
    case OChainName.suiOld:
      return getSuiNetworkByEnv(env);

    default:
      return OChainId.ethereum;
  }
}
