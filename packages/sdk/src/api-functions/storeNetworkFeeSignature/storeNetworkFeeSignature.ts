import { isAxiosError } from 'axios';

import { getApiConfig } from '../../common/api-config';
import { IEnvParam } from '../../common/parameters';
import { getErrorMessage } from '../../utils/err';
import { httpPost } from '../../utils/http';

export type IStoreNetworkFeeSignatureStatus = 'success';

interface IStoreNetworkFeeSignatureResponse {
  status: IStoreNetworkFeeSignatureStatus;
}

/**
 * Thrown when the Lombard API refuses to store a new fee signature because
 * an active one already exists for the user. The caller should re-fetch the
 * existing signature (see `getNetworkFeeSignature`) and proceed with it
 * instead of treating this as a fatal authorization failure.
 *
 * The Lombard API returns this as `{ code: 6, message: "Active signature
 * already exists for this user" }`.
 */
export class FeeSignatureAlreadyExistsError extends Error {
  readonly code = 6;
  constructor(message = 'Active signature already exists for this user') {
    super(message);
    this.name = 'FeeSignatureAlreadyExistsError';
  }
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
  getAuthToken,
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

    const { data } = await httpPost<IStoreNetworkFeeSignatureResponse>(
      `${baseApiUrl}/api/v1/claimer/save-user-signature`,
      null,
      { params, getAuthToken },
    );

    return data.status;
  } catch (error) {
    if (
      isAxiosError(error) &&
      (error.response?.data as { code?: number } | undefined)?.code === 6
    ) {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ??
        'Active signature already exists for this user';
      throw new FeeSignatureAlreadyExistsError(message);
    }
    const errorMsg = getErrorMessage(error);
    throw new Error(errorMsg);
  }
}
