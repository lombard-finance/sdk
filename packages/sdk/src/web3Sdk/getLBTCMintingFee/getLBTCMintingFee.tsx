import BigNumber from 'bignumber.js';
import { TChainId } from '../../common/types/types';
import { fromSatoshi } from '../../common/utils/convertSatoshi';
import { ReadProvider } from '../../provider/ReadProvider';
import { chainIdToEnv } from '../utils/chainIdToEnv';
import { getLbtcTokenContract } from '../utils/getLbtcTokenContract';
import { getRpcUrlConfigFromChain } from '../utils/getRpcUrlConfigFromChain';

export interface IGetLBTCMintingFeeParams {
  /**
   * Chain ID
   */
  chainId: TChainId;
  /**
   * RPC URL
   */
  rpcUrl?: string;
}

/**
 * Get LBTC minting fee.
 *
 * @param chainId - Chain ID
 * @param rpcUrl - RPC URL (optional)
 *
 * @returns LBTC minting fee
 */
export async function getLBTCMintingFee({
  chainId,
  rpcUrl,
}: IGetLBTCMintingFeeParams): Promise<BigNumber> {
  const rpcUrlConfig = getRpcUrlConfigFromChain(chainId, rpcUrl);
  const provider = new ReadProvider({ chainId, rpcUrlConfig });
  const env = chainIdToEnv(chainId);
  const tokenContract = getLbtcTokenContract(provider, env);

  const fee: bigint = await tokenContract.methods.getMintFee().call();
  const feeBtc = new BigNumber(fromSatoshi(fee.toString(10)));

  return feeBtc;
}
