import axios from 'axios';
import { IEnvParam } from '../../common/types/internalTypes';
import { getErrorMessage } from '../../common/utils/getErrorMessage';
import { getApiConfig } from '../apiConfig';

export type IStoreStakeAndBakeSignatureStatus = 'success';

interface IStoreStakeAndBakeSignatureResponse {
  status: IStoreStakeAndBakeSignatureStatus;
}

export interface IStoreStakeAndBakeSignatureParams extends IEnvParam {
  /**
   * signature
   */
  signature: string;
  /**
   * JSON typed data used for the signature
   */
  typedData: string;
}

/**
 * Store stake and bake signature
 *
 * @param {IStoreStakeAndBakeSignatureParams} params - The parameters for storing stake and bake signature
 *
 * @returns {Promise<IStoreStakeAndBakeSignatureStatus>} Response promise with status
 *
 */
export async function storeStakeAndBakeSignature({
  signature,
  typedData,
  env,
}: IStoreStakeAndBakeSignatureParams): Promise<IStoreStakeAndBakeSignatureStatus> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const { data } = await axios.post<IStoreStakeAndBakeSignatureResponse>(
      `${baseApiUrl}/api/v1/claimer/save-stake-and-bake-signature`,
      null,
      {
        params: {
          typed_data: typedData,
          signature,
        },
      },
    );

    return data.status;
  } catch (error) {
    const errorMsg = getErrorMessage(error);

    throw new Error(errorMsg);
  }
}