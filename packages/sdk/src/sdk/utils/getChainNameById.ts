import { OChainId, TChainId } from '../../common/types/types';
import { OChainName, TChainName } from '../internalTypes';

/**
 * @param chainId the chain ID
 *
 * @returns the chain name
 */
export function getChainNameById(chainId: TChainId): TChainName {
  switch (chainId) {
    case OChainId.holesky:
    case OChainId.ethereum:
      return OChainName.eth;
    default:
      throw new Error(`Unknown chain ID: ${chainId}`);
  }
}
