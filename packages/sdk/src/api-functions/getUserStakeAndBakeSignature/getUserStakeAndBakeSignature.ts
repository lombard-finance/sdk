import { getApiConfig } from '../../common/api-config';
import { ChainId } from '../../common/chains';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';
import { httpGet } from '../../utils/http';

export interface IGetUserStakeAndBakeSignatureParams extends IEnvParam {
  /**
   * User's destination address
   */
  userDestinationAddress: string;
  /**
   * Chain ID
   */
  chainId: ChainId;
}

export interface IGetUserStakeAndBakeSignatureResponse {
  /**
   * The user's destination address
   */
  userDestinationAddress: string;
  /**
   * The signature (may be empty if signature exists but not returned)
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
  /**
   * The nonce (increments with each new signature)
   */
  nonce?: string;
}

interface IGetUserStakeAndBakeSignatureAPIResponse {
  user_destination_address: string;
  signature: string;
  expiration_date: string;
  deposit_amount: string;
  chain_id: string;
  nonce?: string;
}

/**
 * Get user's stake and bake signature from the API
 *
 * @param {IGetUserStakeAndBakeSignatureParams} parameters - Parameters for getting the signature
 * @param {string} parameters.userDestinationAddress - The destination account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IGetUserStakeAndBakeSignatureResponse>} Promise that resolves to the signature response
 */
export async function getUserStakeAndBakeSignature({
  userDestinationAddress,
  chainId,
  env,
  getAuthToken,
}: IGetUserStakeAndBakeSignatureParams): Promise<IGetUserStakeAndBakeSignatureResponse> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const { data } = await httpGet<IGetUserStakeAndBakeSignatureAPIResponse>(
      `${baseApiUrl}/api/v1/claimer/get-user-stake-and-bake-signature`,
      {
        params: {
          userDestinationAddress,
          chainId: chainId.toString(),
        },
        getAuthToken,
      },
    );

    return {
      userDestinationAddress: data.user_destination_address,
      signature: data.signature,
      expirationDate: data.expiration_date,
      depositAmount: data.deposit_amount,
      chainId: data.chain_id,
      nonce: data.nonce,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    throw new Error(
      `Failed to get user stake and bake signature: ${errorMessage}`,
    );
  }
}
