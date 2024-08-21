import { defaultEnv } from '../../common/const';
import { OChainId, OEnv, TChainId, TEnv } from '../../common/types/types';
import { TChainName } from '../internalTypes';

/**
 * @param chainId the chain ID
 *
 * @returns the chain name
 */
export function getCainIdByName(
  chain: string,
  env: TEnv = defaultEnv,
): TChainId {
  switch (chain as TChainName) {
    case 'DESTINATION_BLOCKCHAIN_ETHEREUM':
      return env === OEnv.prod ? OChainId.ethereum : OChainId.holesky;

    default:
      return OChainId.ethereum;
  }
}
