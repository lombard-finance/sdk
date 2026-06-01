import BigNumber from 'bignumber.js';
import { Address } from 'viem';

import { getApiConfig } from '../../../common/api-config';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import { IStrategyRatesSnapshot } from '../types';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';
import { getVaultBlockchainParam, userAuthorizedGet } from './userEndpoints';

export interface GetStrategyRatesHistoryParameters extends IEnvParam {
  chainId: ChainId;
  walletJwt: string;
  strategy?: Address;
  startTime?: Date;
  endTime?: Date;
}

interface IRawRatesSample {
  captured_at?: string;
  net_carry_bps?: number;
  strc_yield_bps?: number;
}

interface IRawRatesHistoryResponse {
  samples?: ReadonlyArray<IRawRatesSample>;
}

const BPS_DIVISOR = new BigNumber(10_000);

/**
 * Fetches the Strategy aggregate-rates time series (net carry, STRC yield)
 * from the vault-manager API
 * (`GET /v1/vault/strategies/{address}/rates-history`).
 *
 * API returns rates in basis points; this function converts them to
 * fractions (1.0 = 100%) so consumers can render directly with a percent
 * formatter. Returns an empty array when no samples exist yet.
 */
export async function getStrategyRatesHistory(
  params: GetStrategyRatesHistoryParameters,
): Promise<IStrategyRatesSnapshot[]> {
  const { chainId, strategy, walletJwt, startTime, endTime, env } = params;
  assertLombardStrategyChain(chainId);
  const address = resolveStrategyAddress(chainId, strategy);

  const { baseApiV2Url } = getApiConfig(env);
  const blockchain = getVaultBlockchainParam(chainId);

  const query = new URLSearchParams({ blockchain });
  if (startTime) query.set('start_time', startTime.toISOString());
  if (endTime) query.set('end_time', endTime.toISOString());

  const url = `${baseApiV2Url.replace(/\/$/, '')}/v1/vault/strategies/${address}/rates-history?${query.toString()}`;
  const raw = await userAuthorizedGet<IRawRatesHistoryResponse>(url, walletJwt);

  return (raw?.samples ?? []).map((s) => ({
    timestamp: s.captured_at ? new Date(s.captured_at) : new Date(0),
    netCarry: new BigNumber(s.net_carry_bps ?? 0).div(BPS_DIVISOR),
    strcYield: new BigNumber(s.strc_yield_bps ?? 0).div(BPS_DIVISOR),
  }));
}
