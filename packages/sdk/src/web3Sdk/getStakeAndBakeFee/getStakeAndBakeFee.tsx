import { TChainId } from '../../common/types/types';
import { ReadProvider } from '../../provider/ReadProvider';
import { getRpcUrlConfigFromChain } from '../utils/getRpcUrlConfigFromChain';
import { STAKE_AND_BAKE } from '../abi';
import { getErrorMessage } from '../../common/utils/getErrorMessage';

export interface IGetStakeAndBakeFeeParams {
  /**
   * Chain ID
   */
  chainId: TChainId;
  /**
   * RPC URL
   */
  rpcUrl?: string;
  /**
   * Vault Address
   */
  vaultAddress: string;
}

/**
 * Get Stake and bake fee.
 *
 * @param chainId - Chain ID
 * @param rpcUrl - RPC URL (optional)
 * @param vaultAddress - Vault Address
 *
 * @returns Stake and bake fee in satoshis
 */
export async function getStakeAndBakeFee({
  chainId,
  rpcUrl,
  vaultAddress,
}: IGetStakeAndBakeFeeParams): Promise<string> {
  const rpcUrlConfig = getRpcUrlConfigFromChain(chainId, rpcUrl);
  const provider = new ReadProvider({ chainId, rpcUrlConfig });

  try {
    const contract = provider.createContract(STAKE_AND_BAKE, vaultAddress);

    const fee: bigint = await contract.methods.getStakeAndBakeFee().call();
    return fee.toString();
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(errorMessage);
  }
}
