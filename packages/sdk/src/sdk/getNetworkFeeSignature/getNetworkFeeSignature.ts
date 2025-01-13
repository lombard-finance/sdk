import axios from 'axios';

import { IEnvParam } from '../../common/types/internalTypes';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { getApiConfig } from '../apiConfig';

export interface IGetNetworkFeeSignatureParams extends IEnvParam {
  /**
   * Chain ID of the network to interact with
   */
  chainId: number;
  /**
   * Destination address
   */
  address: string;
}

interface IGetNetworkFeeSignatureResponse {
  /**
   * Expiration date of signature
   */
  expiration_date: string;
  /**
   * The flag signature exists
   */
  has_signature: boolean;
  /**
   * The auto mint is delayed
   */
  is_delayed: boolean;
}

export interface IGetNetworkFeeSignatureMappedResponse {
  /**
   * Expiration date of signature
   */
  expirationDate: string;
  /**
   * The flag signature exists
   */
  hasSignature: boolean;
  /**
   * The auto mint is delayed
   */
  isDelayed: boolean;
}

/**
 * Returns the expiration date and the flag signature exists
 *
 * @returns {Promise<IGetNetworkFeeSignatureResponse>} authorize network fee sign promise
 */
export async function getNetworkFeeSignature({
  address,
  chainId,
  env,
}: IGetNetworkFeeSignatureParams): Promise<IGetNetworkFeeSignatureMappedResponse> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const { data } = await axios.get<IGetNetworkFeeSignatureResponse>(
      `${baseApiUrl}/api/v1/claimer/get-user-signature`,
      {
        params: {
          user_destination_address: address,
          chain_id: chainId,
        },
      },
    );

    return {
      expirationDate: data?.expiration_date,
      hasSignature: data?.has_signature,
      isDelayed: data?.is_delayed,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    throw new Error(errorMessage);
  }
}
