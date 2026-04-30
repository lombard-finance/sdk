import axios from 'axios';

import { getApiConfig } from '../../common/api-config';
import type { IEnvParam } from '../../common/parameters';

interface ApiResponse {
  exists?: boolean;
  referrer?: string;
}

export interface GetDepositAddressReferrerParams extends IEnvParam {
  address: string;
}

export interface DepositAddressReferrerResult {
  hasDepositAddress: boolean;
  referrer?: string;
}

/**
 * Fetch the referrer associated with a previously generated BTC deposit address.
 *
 * @param params - Address lookup parameters
 */
export async function getDepositAddressReferrer({
  address,
  env }: GetDepositAddressReferrerParams): Promise<DepositAddressReferrerResult> {
  const { baseApiUrl } = getApiConfig(env);
  const { data } = await axios.get<ApiResponse>(
    `${baseApiUrl}/api/v1/address/exists/${address}`,
  );

  return {
    hasDepositAddress: Boolean(data.exists),
    referrer: data.referrer };
}
