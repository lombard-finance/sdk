import BigNumber from 'bignumber.js';
import { Address } from 'viem';

import { getApiConfig } from '../../../common/api-config';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import { resolveStrategy, StrategyId } from '../config';
import { IStrategyRatesSnapshot } from '../types';
import { getVaultBlockchainParam, userAuthorizedGet } from './userEndpoints';

export interface GetStrategyRatesHistoryParameters extends IEnvParam {
  walletJwt: string;
  /** Chain to target when the env spans multiple chains; defaults to primary. */
  chainId?: ChainId;
  /** Strategy to target. Defaults to the canonical strategy (BTCoc). */
  strategyId?: StrategyId;
  /** Override the resolved Strategy contract address. */
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
 * (`GET /v2/vaults/strategies/{address}/rates-history`).
 *
 * API returns rates in basis points; this function converts them to
 * fractions (1.0 = 100%) so consumers can render directly with a percent
 * formatter. Returns an empty array when no samples exist yet.
 */
export async function getStrategyRatesHistory(
  params: GetStrategyRatesHistoryParameters,
): Promise<IStrategyRatesSnapshot[]> {
  const {
    strategy,
    strategyId,
    walletJwt,
    startTime,
    endTime,
    env,
    chainId: requestedChainId,
  } = params;
  const { chainId, address } = resolveStrategy({
    env,
    strategyId,
    strategy,
    chainId: requestedChainId,
  });

  const { baseApiV2Url } = getApiConfig(env);
  const blockchain = getVaultBlockchainParam(chainId);

  const query = new URLSearchParams({ blockchain });
  if (startTime) query.set('start_time', startTime.toISOString());
  if (endTime) query.set('end_time', endTime.toISOString());

  const url = `${baseApiV2Url.replace(/\/$/, '')}/v2/vaults/strategies/${address}/rates-history?${query.toString()}`;
  const raw = await userAuthorizedGet<IRawRatesHistoryResponse>(url, walletJwt);

  return (raw?.samples ?? []).map((s) => ({
    timestamp: s.captured_at ? new Date(s.captured_at) : new Date(0),
    netCarry: new BigNumber(s.net_carry_bps ?? 0).div(BPS_DIVISOR),
    strcYield: new BigNumber(s.strc_yield_bps ?? 0).div(BPS_DIVISOR),
  }));
}
