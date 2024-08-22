import axios from 'axios';
import { IEnvParam } from '../../common/types/internalTypes';
import { TChainId } from '../../common/types/types';
import { getApiConfig } from '../apiConfig';
import { getChainNameById } from '../utils/getChainNameById';

type ExchangeRateResponse = {
  amount_out: string;
};

export interface IGetLBTCExchageRateParams extends IEnvParam {
  /**
   * The chain id of the asset to get the exchange rate for
   */
  chainId: TChainId;
  /**
   * The amount of the asset to get the exchange rate for
   */
  amount: number;
}

/**
 * Retrieves the exchange rate for LBTC.
 *
 * @param {IGetLBTCExchageRateParams} params
 *
 * @returns {Promise<string>} - The exchange rate.
 */
export async function getLBTCExchageRate({
  env,
  chainId,
  amount,
}: IGetLBTCExchageRateParams): Promise<string> {
  const { baseApiUrl } = getApiConfig(env);
  const chainIdName = getChainNameById(chainId);

  const { data } = await axios.get<ExchangeRateResponse>(
    `api/v1/exchange/rate/${chainIdName}`,
    { baseURL: baseApiUrl, params: { amount } },
  );

  return data.amount_out;
}
