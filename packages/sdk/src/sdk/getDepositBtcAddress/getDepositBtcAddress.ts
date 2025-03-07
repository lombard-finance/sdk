import axios from 'axios';
import { IEnvParam } from '../../common/types/internalTypes';
import { SuiChain, TChainId } from '../../common/types/types';
import { getApiConfig } from '../apiConfig';
import { TChainName } from '../internalTypes';
import { getChainNameById } from '../utils/getChainNameById';

const ADDRESS_URL = 'api/v1/address';

type TPartnerId = 'lombard' | string;

interface IDepositAddress {
  btc_address: string;
  created_at: string;
  deprecated?: boolean;
  type: string;
  used?: boolean;
  deposit_metadata: {
    referral: TPartnerId;
    partner_id: TPartnerId;
    to_address: string;
    to_blockchain: TChainName;
  };
}

interface IDepositAddressesResponse {
  addresses: IDepositAddress[];
  has_more?: boolean;
}

export interface IGetDepositBtcAddressParams extends IEnvParam {
  /**
   * The destination EVM user address where LBTC will be claimed.
   */
  address: string;
  /**
   * The destination chain ID where LBTC will be claimed.
   */
  chainId: TChainId | SuiChain;
  /**
   * The referral ID.
   */
  partnerId: TPartnerId;
}

/**
 * Returns the address for depositing BTC.
 *
 * @param {IGetDepositBtcAddressParams} params - function parameters
 *
 * @returns {Promise<string>} the address for depositing BTC
 */
export async function getDepositBtcAddress({
  address,
  chainId,
  env,
  partnerId,
}: IGetDepositBtcAddressParams): Promise<string> {
  const addresses = await getDepositBtcAddresses({
    address,
    chainId,
    env,
    partnerId,
  });

  const addressData = getActualAddress(addresses);

  if (!addressData) {
    throw new Error('No address');
  }

  return addressData.btc_address;
}

/**
 * Retrieves the actual deposit address from a list of deposit addresses.
 *
 * @param addresses - The list of deposit addresses.
 * @returns The actual deposit address or undefined if the last created address is deprecated.
 */
function getActualAddress(
  addresses: IDepositAddress[],
): IDepositAddress | undefined {
  if (!addresses.length) {
    return undefined;
  }

  const actualAddress = addresses.reduce((acc, address) => {
    if (acc.created_at < address.created_at) {
      return address;
    }
    return acc;
  }, addresses[0]);

  return actualAddress.deprecated ? undefined : actualAddress;
}

/**
 * Returns the addresses for depositing BTC.
 *
 * @param {IGetDepositBtcAddressParams} params - function parameters
 *
 * @returns {Promise<IDepositAddress[]>} the deposit addresses
 */
export async function getDepositBtcAddresses({
  address,
  chainId,
  env,
  partnerId,
}: IGetDepositBtcAddressParams): Promise<IDepositAddress[]> {
  const { baseApiUrl } = getApiConfig(env);
  const toBlockchain = getChainNameById(chainId);

  const requestParams = {
    to_address: address,
    to_blockchain: toBlockchain,
    limit: 1,
    offset: 0,
    asc: false,
    referralId: partnerId,
  };

  const { data } = await axios.get<IDepositAddressesResponse>(ADDRESS_URL, {
    baseURL: baseApiUrl,
    params: requestParams,
  });

  return data?.addresses || [];
}
