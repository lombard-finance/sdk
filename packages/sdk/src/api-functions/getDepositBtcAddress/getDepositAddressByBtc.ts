import axios from 'axios';

import { getApiConfig } from '../../common/api-config';
import { getHttpClient } from '../../common/http-client';
import type { IEnvParam } from '../../common/parameters';
import {
  type IApiError,
  type IDepositAddress,
  type IV2GetDepositAddressResponse,
  mapV2DepositAddress,
} from './types';

export interface IGetDepositAddressByBtcParameters extends IEnvParam {
  /**
   * The BTC deposit address to look up.
   */
  btcAddress: string;
  /**
   * The destination address the deposit address resolves to.
   *
   * Required for wallet-authenticated callers — the gateway only returns a
   * deposit address whose destination matches the caller's authenticated
   * address (an unmatched or unknown address yields "not found"). Optional for
   * API-key callers.
   */
  destinationAddress?: string;
}

/**
 * Fetch a single deposit address by its BTC address.
 *
 * `GET /v2/addresses/deposit/{btc_address}`
 *
 * @returns The deposit address with its metadata, or `undefined` if not found.
 * @throws {Error} On non-404 API errors.
 */
export async function getDepositAddressByBtc({
  btcAddress,
  destinationAddress,
  env,
}: IGetDepositAddressByBtcParameters): Promise<IDepositAddress | undefined> {
  const { baseApiUrl } = getApiConfig(env);

  const params: { destination_address?: string } = {};
  if (destinationAddress) {
    params.destination_address = destinationAddress;
  }

  const url = `v2/addresses/deposit/${encodeURIComponent(btcAddress)}`;
  try {
    const { data } =
      await getHttpClient(env).get<IV2GetDepositAddressResponse>(url, {
        baseURL: baseApiUrl,
        params,
      });

    return data.deposit_address
      ? mapV2DepositAddress(data.deposit_address)
      : undefined;
  } catch (err) {
    if (axios.isAxiosError<IApiError>(err)) {
      // Treat "not found" as an absent address rather than an error, matching
      // the gateway's IDOR-safe NotFound for unmatched destinations.
      if (err.response?.status === 404) {
        return undefined;
      }
      throw new Error(err.response?.data.message ?? err.message);
    }
    throw err;
  }
}
