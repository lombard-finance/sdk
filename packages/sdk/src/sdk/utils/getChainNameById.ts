import { OChainId, TChainId } from '../../common/types/types';
import { OChainName, TChainName } from '../internalTypes';

/**
 * @param chainId the chain ID
 *
 * @returns the chain name
 */
export function getChainNameById(chainId: TChainId): TChainName {
  switch (chainId) {
    case OChainId.ethereum:
    case OChainId.holesky:
    case OChainId.sepolia:
      return OChainName.eth;
    case OChainId.base:
    case OChainId.baseSepoliaTestnet:
      return OChainName.base;
    case OChainId.binanceSmartChain:
    case OChainId.binanceSmartChainTestnet:
      return OChainName.bsc;
    default:
      throw new Error(`Unknown chain ID: ${chainId}`);
  }
}
