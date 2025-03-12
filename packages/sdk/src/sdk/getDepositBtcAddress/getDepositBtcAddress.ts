import axios from 'axios';
import { IEnvParam } from '../../common/types/internalTypes';
import { SuiChain, TChainId } from '../../common/types/types';
import { getApiConfig } from '../apiConfig';
import { TChainName } from '../internalTypes';
import { getChainNameById } from '../utils/getChainNameById';

export interface IDepositAddress {
  /**
   * The deposit address for BTC.
   */
  btc_address: string;
  /**
   * The address creation timestamp.
   */
  created_at: string;
  /**
   * A flag determining whether an address is deprecated (no longer valid for depositing BTC).
   */
  deprecated?: boolean;
  /**
   * Type of an address.
   * @constant {string} - ADDRESS_TYPE_DEPOSIT
   */
  type: string;
  /**
   * A flag determining whether an address has been used.
   */
  used?: boolean;

  /**
   * The deposit address metadata
   */
  deposit_metadata: {
    /**
     * The partner (referral) id.
     */
    referral: string;
    /**
     * The partner (referral) id.
     */
    partner_id: string;
    /**
     * The destination address.
     */
    to_address: string;
    /**
     * The destination blockchain corresponding to the `to_address`
     */
    to_blockchain: TChainName;
  };
}

interface IDepositAddressesResponse {
  addresses: IDepositAddress[];
  has_more?: boolean;
}

interface IApiError {
  code: number;
  message?: string;
}

export interface IGetDepositBtcAddressesParameters extends IEnvParam {
  /**
   * The destination address where LBTC will be claimed.
   */
  address: string;

  /**
   * The destination chain where the `address` exists and where LBTC will be claimed.
   */
  chainId: TChainId | SuiChain;
  /**
   * The maximum number of items to return.
   * @default {number} 1
   */
  limit?: number;

  /**
   * The number of items to skip before starting to return the items.
   * @default {number} 0
   */
  offset?: number;

  /**
   * The partner (referral) id.
   * @default {string} "lombard"
   */
  partnerId?: string;
}

async function makeRequest({
  address,
  chainId,
  env,
  limit,
  offset,
  partnerId,
}: IGetDepositBtcAddressesParameters) {
  const { baseApiUrl } = getApiConfig(env);

  // throws an error if `chainId` is unknown
  const destinationBlockchain = getChainNameById(chainId);

  const params = {
    asc: false,
    limit,
    offset,
    referralId: partnerId || 'lombard',
  };

  // remove undefined fields, undefined limit and offset params cause error
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined) {
      delete params[k as keyof typeof params];
    }
  });

  const url = `api/v1/address/destination/${destinationBlockchain}/${address}`;
  try {
    const { data } = await axios.get<IDepositAddressesResponse>(url, {
      baseURL: baseApiUrl,
      params,
    });

    return data.addresses || [];
  } catch (err) {
    if (axios.isAxiosError<IApiError>(err)) {
      const message = err.response?.data.message;
      throw new Error(message);
    }
  }
}

export type IGetDepositBtcAddressParameters = Pick<
  IGetDepositBtcAddressesParameters,
  'address' | 'chainId' | 'env' | 'partnerId'
>;

/**
 * Returns the current address for depositing BTC by given parameters.
 * @throws {Error} - Throws an error if no address found or the provided chain id is not supported.
 */
export async function getDepositBtcAddress({
  address,
  chainId,
  env,
  partnerId,
}: IGetDepositBtcAddressParameters) {
  const addresses = await makeRequest({
    address,
    chainId,
    env,
    partnerId,
  });

  let depositAddress: string | undefined = undefined;

  if (addresses && addresses.length > 0) {
    const mostRecentAddress = addresses.reduce((mostRecent, cur) => {
      if (cur.created_at > mostRecent.created_at) {
        return cur;
      }
      return mostRecent;
    }, addresses[0]);

    if (!mostRecentAddress.deprecated) {
      depositAddress = mostRecentAddress.btc_address;
    }
  }

  if (!depositAddress) {
    throw new Error(
      `No deposit address found for ${address} on chain ${chainId}`,
    );
  }

  return depositAddress;
}

/**
 * Returns the addresses for depositing BTC by given parameters.
 * @throws {Error} - Throws an error if chain id is not supported.
 */
export async function getDepositBtcAddresses(
  parameters: IGetDepositBtcAddressesParameters,
) {
  const addresses = await makeRequest(parameters);
  return addresses;
}
