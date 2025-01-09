import { IEnvParam } from '../../common/types/internalTypes';
import { Provider } from '../../provider';
import { SECONDS_PER_DAY } from '../const';
import { IProviderBasedParams } from '../types';
import { getLbtcTokenContract } from '../utils/getLbtcTokenContract';
import { getTypedData } from './getTypedData';

const NO_SIGNATURE_ERROR =
  'Failed to obtain a valid signature. The response is undefined or invalid.';

export interface ISignNetworkFeeParams
  extends Pick<IProviderBasedParams, 'provider' | 'chainId'>,
    IEnvParam {
  /**
   * User address
   */
  address: string;
  /**
   * Authorization fee
   */
  fee: string;
  /**
   * Expiration time
   */
  expiry: number;
}

export interface ISignNetworkFeeResponse {
  /**
   * signature
   */
  signature: string;
  /**
   * JSON typed data used for the signature
   */
  typedData: string;
}

const getDefaultExpiryUnix = () => {
  return Math.floor(Date.now() / 1000 + SECONDS_PER_DAY);
};

/**
 * Signs the network fee transaction in the current account.
 * Signing is necessary for the auto-mint.
 *
 * @param {ISignNetworkFeeParams} params - The parameters for signing network fee
 * @returns {Promise<ISignNetworkFeeResponse>} A promise that resolves to the signature and typed data
 */
export async function signNetworkFee({
  address,
  provider,
  fee,
  chainId,
  env,
  expiry = getDefaultExpiryUnix(),
}: ISignNetworkFeeParams): Promise<ISignNetworkFeeResponse> {
  const providerInstance = new Provider({
    provider,
    account: address,
    chainId,
  });

  const tokenContract = getLbtcTokenContract(providerInstance, env);
  const verifyingContract = tokenContract.options.address;
  const typedData = JSON.stringify(
    getTypedData({
      chainId,
      verifyingContract,
      fee,
      expiry,
    }),
  );

  const signature = await providerInstance.web3?.currentProvider?.request<
    'eth_signTypedData_v4',
    string
  >({
    method: 'eth_signTypedData_v4',
    params: [address, typedData],
  });

  if (typeof signature === 'string') {
    return { signature, typedData: typedData };
  }

  if (!signature?.result) {
    throw new Error(NO_SIGNATURE_ERROR);
  }

  return { signature: signature.result, typedData: typedData };
}
