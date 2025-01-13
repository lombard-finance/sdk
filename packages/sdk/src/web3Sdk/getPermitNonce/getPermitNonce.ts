import { TChainId } from '../../common/types/types';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { ReadProvider } from '../../provider/ReadProvider';
import { chainIdToEnv } from '../utils/chainIdToEnv';
import { getLbtcTokenContract } from '../utils/getLbtcTokenContract';
import { getRpcUrlConfigFromChain } from '../utils/getRpcUrlConfigFromChain';

export interface IGetPermitNonceParams {
  /**
   * Owner address to check permit nonce for
   */
  owner: string;
  /**
   * Chain ID of the network
   */
  chainId: TChainId;
  /**
   * RPC URL for the network (optional)
   */
  rpcUrl?: string;
}

/**
 * Get permit nonce for a specific owner address from LBTC contract.
 * This nonce is used in EIP-2612 permit operations.
 *
 * @param {IGetPermitNonceParams} params - Parameters for getting permit nonce
 * @returns {Promise<string>} Promise that resolves to the permit nonce value
 */
export async function getPermitNonce({
  owner,
  rpcUrl,
  chainId,
}: IGetPermitNonceParams): Promise<string> {
  const rpcUrlConfig = getRpcUrlConfigFromChain(chainId, rpcUrl);
  const provider = new ReadProvider({ chainId, rpcUrlConfig });
  const env = chainIdToEnv(chainId);
  const tokenContract = getLbtcTokenContract(provider, env);

  try {
    const nonce: bigint = await tokenContract.methods.nonces(owner).call();
    return nonce.toString();
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage);
  }
}
