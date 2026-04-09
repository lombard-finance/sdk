import axios from "axios";

import { getApiConfig } from "../../common/api-config";
import { IEnvParam } from "../../common/parameters";
import { getErrorMessage } from "../../utils/err";

export type IStoreStakeAndBakeSignatureStatus = "success";

interface IStoreStakeAndBakeSignatureResponse {
  status: IStoreStakeAndBakeSignatureStatus;
}

const EMPTY_SIGNATURE = "0x00";

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
 * @param {IStoreStakeAndBakeSignatureParams} parameters - The parameters for storing stake and bake signature
 * @param {string} parameters.signature - The signature.
 * @param {string} parameters.typedData - The serialized typed data.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IStoreStakeAndBakeSignatureStatus>}
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
          signature: signature || EMPTY_SIGNATURE,
        },
      },
    );

    return data.status;
  } catch (error) {
    const errorMsg = getErrorMessage(error);

    throw new Error(errorMsg);
  }
}
