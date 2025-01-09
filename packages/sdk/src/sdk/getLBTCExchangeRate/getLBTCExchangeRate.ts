import axios from 'axios';
import BigNumber from 'bignumber.js';
import { IEnvParam } from '../../common/types/internalTypes';
import { OChainId, TChainId } from '../../common/types/types';
import { SATOSHI_SCALE } from '../../common/utils/convertSatoshi';
import { getApiConfig } from '../apiConfig';
import { MIN_STAKE_AMOUNT_BTC } from '../const';
import { getChainNameById } from '../utils/getChainNameById';

type ExchangeRateResponse = {
  amount_out: string;
};

export interface IgetLBTCExchangeRateParams extends IEnvParam {
  /**
   * The chain id of the asset to get the exchange rate for. Exchange rate is the same for all chains so this param is optional.
   *
   * @default OChainId.ethereum
   */
  chainId?: TChainId;
  /**
   * The amount of the asset to get the exchange rate for. If not provided, the exchange rate will be returned for 1 BTC.
   *
   * @default 1
   */
  amount?: number;
}

export interface IgetLBTCExchangeRateResponse {
  /**
   * The exchange rate for LBTC:BTC
   */
  exchangeRate: number;
  /**
   * The minimum amount of the asset to stake
   */
  minAmount: number;
}

/**
 * Retrieves the exchange rate for LBTC.
 *
 * @param {IgetLBTCExchangeRateParams} params
 *
 * @returns {Promise<IgetLBTCExchangeRateResponse>} - The exchange rate.
 */
export async function getLBTCExchangeRate({
  env,
  chainId = OChainId.ethereum,
  amount = 1,
}: IgetLBTCExchangeRateParams): Promise<IgetLBTCExchangeRateResponse> {
  const { baseApiUrl } = getApiConfig(env);
  const chainIdName = getChainNameById(chainId);

  const { data } = await axios.get<ExchangeRateResponse>(
    `api/v1/exchange/rate/${chainIdName}`,
    { baseURL: baseApiUrl, params: { amount } },
  );

  const minAmount = new BigNumber(MIN_STAKE_AMOUNT_BTC)
    .multipliedBy(SATOSHI_SCALE)
    .toFixed();

  return { exchangeRate: +data.amount_out, minAmount: +minAmount };
}
