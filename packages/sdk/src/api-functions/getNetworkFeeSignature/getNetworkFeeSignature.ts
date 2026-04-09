import axios from "axios";

import { getApiConfig } from "../../common/api-config";
import { ChainId } from "../../common/chains";
import { IEnvParam } from "../../common/parameters";
import { getErrorMessage } from "../../utils/err";

export interface IGetNetworkFeeSignatureParams extends IEnvParam {
  /**
   * Chain ID of the network to interact with
   */
  chainId: ChainId;
  /**
   * Destination address
   */
  address: string;
  /**
   * Token address (optional, required for BTC.b)
   */
  tokenAddress?: string;
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
  /**
   * Serialized signature when available
   */
  signature?: string;
  /**
   * Serialized typed data associated with the signature when available
   */
  typed_data?: string;
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
  /**
   * Serialized signature when available
   */
  signature?: string;
  /**
   * Serialized typed data associated with the signature when available
   */
  typedData?: string;
}

/**
 * Returns the expiration date and the flag signature exists
 *
 * @param {IGetNetworkFeeSignatureParams} parameters - The parameters.
 * @param {string} parameters.address - The account address.
 * @param {ChainId} parameters.chainId - The chain id.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IGetNetworkFeeSignatureResponse>}
 */
export async function getNetworkFeeSignature({
  address,
  chainId,
  env,
  tokenAddress,
}: IGetNetworkFeeSignatureParams): Promise<IGetNetworkFeeSignatureMappedResponse> {
  const { baseApiUrl } = getApiConfig(env);

  try {
    const params: Record<string, string | number> = {
      user_destination_address: address,
      chain_id: chainId,
    };

    if (tokenAddress) {
      params.token_address = tokenAddress;
    }

    const { data } = await axios.get<IGetNetworkFeeSignatureResponse>(
      `${baseApiUrl}/api/v1/claimer/get-user-signature`,
      {
        params,
      },
    );

    return {
      expirationDate: data?.expiration_date,
      hasSignature: data?.has_signature,
      isDelayed: data?.is_delayed,
      signature: data?.signature,
      typedData: data?.typed_data,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    throw new Error(errorMessage);
  }
}
