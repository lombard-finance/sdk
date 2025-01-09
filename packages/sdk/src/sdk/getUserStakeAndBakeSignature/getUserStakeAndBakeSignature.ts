import axios from 'axios';
import { IEnvParam } from '../../common/types/internalTypes';
import { TChainId } from '../../common/types/types';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { getApiConfig } from '../apiConfig';

export interface IGetUserStakeAndBakeSignatureParams extends IEnvParam {
  /**
   * User's destination address
   */
  userDestinationAddress: string;
  /**
   * Chain ID
   */
  chainId: TChainId;
}

export interface IGetUserStakeAndBakeSignatureResponse {
  /**
   * The user's destination address
   */
  userDestinationAddress: string;
  /**
   * The signature
   */
  signature: string;
  /**
   * The expiration date
   */
  expirationDate: string;
  /**
   * The deposit amount
   */
  depositAmount: string;
  /**
   * The chain ID
   */
  chainId: string;
}

interface IGetUserStakeAndBakeSignatureAPIResponse {
  user_destination_address: string;
  signature: string;
  expiration_date: string;
  deposit_amount: string;
  chain_id: string;
}

/**
 * Get user's stake and bake signature from the API
 *
 * @param {IGetUserStakeAndBakeSignatureParams} params - Parameters for getting the signature
 * @returns {Promise<IGetUserStakeAndBakeSignatureResponse>} Promise that resolves to the signature response
 */
export async function getUserStakeAndBakeSignature({
  userDestinationAddress,
  chainId,
  env,
}: IGetUserStakeAndBakeSignatureParams): Promise<IGetUserStakeAndBakeSignatureResponse> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const { data } = await axios.get<IGetUserStakeAndBakeSignatureAPIResponse>(
      `${baseApiUrl}/api/v1/claimer/get-user-stake-and-bake-signature`,
      {
        params: {
          userDestinationAddress,
          chainId: chainId.toString(),
        },
      },
    );

    return {
      userDestinationAddress: data.user_destination_address,
      signature: data.signature,
      expirationDate: data.expiration_date,
      depositAmount: data.deposit_amount,
      chainId: data.chain_id,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to get user stake and bake signature: ${errorMessage}`,
    );
  }
}
