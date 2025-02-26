import { OChainId, TChainId } from '../../common/types/types';
import { OChainName, TChainName } from '../internalTypes';

/**
 * @param chainId the chain ID
 *
 * @returns the chain name
 */
export function getChainNameById(
  chainId:
    | TChainId
    | 'sui:testnet'
    | 'sui:mainnet'
    | 'sui:devnet'
    | 'sui:localnet',
): TChainName {
  if (
    chainId === OChainId.ethereum ||
    chainId === OChainId.holesky ||
    chainId === OChainId.sepolia
  ) {
    return OChainName.eth;
  }

  if (chainId === OChainId.base || chainId === OChainId.baseSepoliaTestnet) {
    return OChainName.base;
  }

  if (
    chainId === OChainId.binanceSmartChain ||
    chainId === OChainId.binanceSmartChainTestnet
  ) {
    return OChainName.bsc;
  }

  if (chainId === 'sui:testnet' || chainId === 'sui:mainnet') {
    return OChainName.sui;
  }

  throw new Error(`Unknown chain ID: ${chainId}`);
}
