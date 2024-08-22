import axios from 'axios';
import { IEnvParam } from '../../common/types/internalTypes';
import { TChainId } from '../../common/types/types';
import { getApiConfig } from '../apiConfig';
import { TChainName } from '../internalTypes';
import { getChainNameById } from '../utils/getChainNameById';

const ADDRESS_URL = 'api/v1/address';

interface IDepositAddress {
  btc_address: string;
  created_at: string;
  deprecated?: boolean;
  type: string;
  used?: boolean;
  deposit_metadata: {
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
  chainId: TChainId;
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
}: IGetDepositBtcAddressParams): Promise<string> {
  const addresses = await getDepositBtcAddresses({ address, chainId, env });

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
  const actualAddress = addresses.reduce((acc, address) => {
    if (acc.created_at < address.created_at) {
      return address;
    }
    return acc;
  });

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
}: IGetDepositBtcAddressParams): Promise<IDepositAddress[]> {
  const { baseApiUrl } = getApiConfig(env);
  const toBlockchain = getChainNameById(chainId);

  const requestrParams = {
    to_address: address,
    to_blockchain: toBlockchain,
    limit: 1,
    offset: 0,
    asc: false,
  };

  const { data } = await axios.get<IDepositAddressesResponse>(ADDRESS_URL, {
    baseURL: baseApiUrl,
    params: requestrParams,
  });

  return data?.addresses || [];
}
