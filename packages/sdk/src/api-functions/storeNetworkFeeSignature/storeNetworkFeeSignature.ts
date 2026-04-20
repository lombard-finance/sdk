import axios from 'axios';

import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';

export type IStoreNetworkFeeSignatureStatus = 'success';

interface IStoreNetworkFeeSignatureResponse {
  status: IStoreNetworkFeeSignatureStatus;
}

export interface IStoreNetworkFeeSignatureParams extends IEnvParam {
  /**
   * signature
   */
  signature: string;
  /**
   * JSON typed data used for the signature
   */
  typedData: string;
  /**
   * Destination address
   */
  address: string;
  /**
   * Token address (required to distinguish LBTC vs BTC.b signatures)
   */
  tokenAddress?: string;
}

/**
 * Authorize network fee
 *
 * @param {IStoreNetworkFeeSignatureParams} parameters - The parameters for network fee authorization
 * @param {string} parameters.address - The destination account address.
 * @param {string} parameters.signature - The signature.
 * @param {string} parameters.typedData - The serialized typed data.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IStoreNetworkFeeSignatureResponse>}
 */
export async function storeNetworkFeeSignature({
  signature,
  typedData,
  address,
  env,
  tokenAddress,
}: IStoreNetworkFeeSignatureParams): Promise<IStoreNetworkFeeSignatureStatus> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const params: Record<string, string> = {
      typed_data: typedData,
      signature,
      user_destination_address: address,
    };

    // Include token address to distinguish LBTC vs BTC.b signatures
    if (tokenAddress) {
      params.token_address = tokenAddress;
    }

    const { data } = await axios.post<IStoreNetworkFeeSignatureResponse>(
      `${baseApiUrl}/api/v1/claimer/save-user-signature`,
      null,
      { params },
    );

    return data.status;
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    throw new Error(errorMsg);
  }
}
