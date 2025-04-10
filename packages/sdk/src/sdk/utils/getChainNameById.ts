import { OChainId, SuiChain, TChainId } from '../../common/types/types';
import { OChainName, TChainName } from '../internalTypes';

/**
 * @param chainId the chain ID
 *
 * @returns the chain name
 */
export function getChainNameById(
  chainId: TChainId | SuiChain,
  isOld = false,
): TChainName {
  if (
    chainId === OChainId.ethereum ||
    chainId === OChainId.holesky ||
    chainId === OChainId.sepolia
  ) {
    return isOld ? OChainName.ethOld : OChainName.eth;
  }

  if (chainId === OChainId.base || chainId === OChainId.baseSepoliaTestnet) {
    return isOld ? OChainName.baseOld : OChainName.base;
  }

  if (
    chainId === OChainId.binanceSmartChain ||
    chainId === OChainId.binanceSmartChainTestnet
  ) {
    return isOld ? OChainName.bscOld : OChainName.bsc;
  }

  if (chainId === OChainId.sonic || chainId === OChainId.sonicBlazeTestnet) {
    return isOld ? OChainName.sonicOld : OChainName.sonic;
  }

  if (chainId === 'sui:testnet' || chainId === 'sui:mainnet') {
    return isOld ? OChainName.suiOld : OChainName.sui;
  }

  throw new Error(`Unknown chain ID: ${chainId}`);
}
