import axios from 'axios';
import BigNumber from 'bignumber.js';

import { getApiConfig } from '../../common/api-config';
import { getChainNameById } from '../../common/blockchain-identifier';
import { ChainId } from '../../common/chains';
import { MIN_STAKE_AMOUNT_BTC } from '../../common/constants';
import { IEnvParam } from '../../common/parameters';
import { toSatoshi } from '../../utils/satoshi';

type ExchangeRateResponse = {
  amount_out: string;
};

export interface IgetLBTCExchangeRateParams extends IEnvParam {
  /**
   * The optional chain id of the asset to get the exchange rate for.
   * Note: Exchange rate it the same for all chains.
   *
   * @default OChainId.ethereum
   */
  chainId?: ChainId;
  /**
   * The amount of the LBTC (in satoshis) that a user would like to exchange to BTC.
   */
  amount?: BigNumber.Value;
}

export interface IgetLBTCExchangeRateResponse {
  /**
   * The exchanged amount (in satoshis).
   */
  amountOut: number;
  /**
   * The exchange rate for LBTC/BTC.
   */
  exchangeRate: number;
  /**
   * The minimum amount of BTC eligible for staking (in satoshis).
   */
  minAmount: number;
}

/**
 * Retrieves the exchange rate for LBTC.
 *
 * @deprecated This API endpoint is deprecated and will be removed in a future version.
 * The exchange rate is now always 1:1 as LBTC is a rebasing token.
 *
 * @param {IgetLBTCExchangeRateParams} parameters - The parameters.
 * @param {BigNumber.Value} parameters.amount - The optional amount to be exchanged.
 * @param {ChainId} parameters.chainId - The optional chain id.
 * @param {Env} parameters.env - The optional environment identifier.
 *
 * @returns {Promise<IgetLBTCExchangeRateResponse>} - The exchange rate.
 */
export async function getLBTCExchangeRate({
  env,
  chainId = ChainId.ethereum,
  amount = toSatoshi(1) }: IgetLBTCExchangeRateParams): Promise<IgetLBTCExchangeRateResponse> {
  const { baseApiUrl } = getApiConfig(env);
  const chainIdName = getChainNameById(chainId);

  const { data } = await axios.get<ExchangeRateResponse>(
    `api/v1/exchange/rate/${chainIdName}`,
    { baseURL: baseApiUrl, params: { amount } },
  );

  const amountOut = BigNumber(data.amount_out).toNumber();
  const exchangeRate = BigNumber(amount).dividedBy(data.amount_out).toNumber();
  const minAmount = toSatoshi(MIN_STAKE_AMOUNT_BTC).toNumber();

  return { amountOut, exchangeRate, minAmount };
}
