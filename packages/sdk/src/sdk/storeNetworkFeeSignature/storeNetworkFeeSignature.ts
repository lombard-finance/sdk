import axios from 'axios';
import { IEnvParam } from '../../common/types/internalTypes';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { getApiConfig } from '../apiConfig';

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
}

/**
 * Authorize network fee
 *
 * @param {IStoreNetworkFeeSignatureParams} params - The parameters for network fee authorization
 *
 * @returns {Promise<IStoreNetworkFeeSignatureResponse>} Response promise with statuses
 *
 */
export async function storeNetworkFeeSignature({
  signature,
  typedData,
  address,
  env,
}: IStoreNetworkFeeSignatureParams): Promise<IStoreNetworkFeeSignatureStatus> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const { data } = await axios.post<IStoreNetworkFeeSignatureResponse>(
      `${baseApiUrl}/api/v1/claimer/save-user-signature`,
      null,
      {
        params: {
          typed_data: typedData,
          signature,
          user_destination_address: address,
        },
      },
    );

    return data.status;
  } catch (error) {
    const errorMsg = getErrorMessage(error);

    throw new Error(errorMsg);
  }
}
