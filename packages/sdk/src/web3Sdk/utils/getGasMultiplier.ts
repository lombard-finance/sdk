import { OChainId } from '../../common/types/types';

/**
 * Returns the gas multiplier for the given chain ID.
 *
 * @param chainId - Chain ID.
 *
 * @returns Gas multiplier.
 */
export function getGasMultiplier(chainId: number): number {
  switch (chainId) {
    case OChainId.ethereum:
      return 1.3;
    case OChainId.holesky:
      return 1.5;
    default:
      return 1.3;
  }
}
