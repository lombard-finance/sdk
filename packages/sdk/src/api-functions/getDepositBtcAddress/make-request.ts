import axios from 'axios';
import { Address, pad } from 'viem';

import { getApiConfig } from '../../common/api-config';
import {
  BlockchainIdentifier,
  getChainNameById,
} from '../../common/blockchain-identifier';
import {
  IApiError,
  IDepositAddressesResponse,
  IGetDepositBtcAddressesParameters,
} from './types';

export async function makeRequest({
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
  if (destinationBlockchain === BlockchainIdentifier.starknet) {
    address = pad(address as Address, { size: 32 });
  }

  const params = {
    asc: false,
    limit,
    offset,
    referralId: partnerId || 'lombard',
  };

  // remove undefined fields, undefined limit and offset params cause error
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) {
      delete params[k as keyof typeof params];
    }
  }

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
