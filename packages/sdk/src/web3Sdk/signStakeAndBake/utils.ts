import { OEnv, TChainId, TEnv } from '../../common/types/types';
import { getLbtcAddressConfig } from '../lbtcAddressConfig';

/**
 * Gets the LBTC contract address for a given chain ID
 * @param chainId The chain ID
 * @returns The LBTC contract address for the chain
 */
export const getVerifyingContract = (
  chainId: TChainId,
  env: TEnv = OEnv.prod,
): string => {
  const lbtcAddressConfig = getLbtcAddressConfig(env);
  const address = lbtcAddressConfig[chainId];
  if (!address) {
    throw new Error(
      `No LBTC contract address configured for chain ID ${chainId}`,
    );
  }
  return address;
};
