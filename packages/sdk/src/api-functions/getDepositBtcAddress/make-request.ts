import axios from 'axios';
import { Address, pad } from 'viem';

import { getApiConfig } from '../../common/api-config';
import {
  BlockchainIdentifier,
  getChainNameById,
} from '../../common/blockchain-identifier';
import { getHttpClient } from '../../common/http-client';
import {
  IApiError,
  IGetDepositBtcAddressesParameters,
  IV2ListDepositAddressesResponse,
  mapV2DepositAddress,
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

  // v2 `destination_chain` is the `Blockchain` enum (e.g. BLOCKCHAIN_ETHEREUM),
  // not the `DestinationBlockchain` enum that getChainNameById returns
  // (DESTINATION_BLOCKCHAIN_*). Drop the DESTINATION_ prefix to get the value
  // the gateway accepts.
  const destinationChain = destinationBlockchain.replace('DESTINATION_', '');

  // v2 ListDepositAddresses query params. `destination_address` is required for
  // wallet-authenticated callers; we always scope by it (mirrors the v1
  // /destination/{chain}/{address} path filter). The gateway accepts a single
  // value for the repeated `destination_chain` / `partner_id` fields.
  const params = {
    destination_address: address,
    destination_chain: destinationChain,
    partner_id: partnerId || 'lombard',
    limit,
    offset,
  };

  // remove undefined fields, undefined limit and offset params cause error
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) {
      delete params[k as keyof typeof params];
    }
  }

  const url = 'v2/addresses/deposit';
  try {
    const { data } =
      await getHttpClient(env).get<IV2ListDepositAddressesResponse>(url, {
        baseURL: baseApiUrl,
        params,
      });

    // Map the v2 wire shape into the stable public IDepositAddress shape so
    // consumers are insulated from the backend field renames.
    return (data.deposit_addresses ?? []).map(mapV2DepositAddress);
  } catch (err) {
    if (axios.isAxiosError<IApiError>(err)) {
      const message = err.response?.data.message;
      throw new Error(message);
    }
  }
}
