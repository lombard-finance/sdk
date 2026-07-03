import BigNumber from 'bignumber.js';
import { Address } from 'viem';

import { getApiConfig } from '../../../common/api-config';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import { resolveStrategy, StrategyId } from '../config';
import { IStrategyNavSnapshot } from '../types';
import { getVaultBlockchainParam, userAuthorizedGet } from './userEndpoints';

export interface GetStrategyNavHistoryParameters extends IEnvParam {
  /** JWT from the wallet-auth flow. Sent as `Authorization: Bearer …`. */
  walletJwt: string;
  /** Chain to target when the env spans multiple chains; defaults to primary. */
  chainId?: ChainId;
  /** Strategy to target. Defaults to the canonical strategy (BTCoc). */
  strategyId?: StrategyId;
  /** Override the resolved Strategy contract address. */
  strategy?: Address;
  /** Inclusive lower bound. Backend defaults to "since inception". */
  startTime?: Date;
  /** Inclusive upper bound. Backend defaults to "now". */
  endTime?: Date;
}

interface IRawNavSnapshot {
  timestamp?: string;
  nav?: string;
  pps?: string;
}

interface IRawNavHistoryResponse {
  snapshots?: ReadonlyArray<IRawNavSnapshot>;
}

/**
 * Fetches a NAV + price-per-share time series for the Strategy from the
 * vault-manager API (`GET /v2/vaults/strategies/{address}/nav-history`).
 *
 * Both `nav` and `pricePerShare` are returned in base-units (1e8 on Lombard
 * Strategies) by the API and converted to human-readable `BigNumber`s here
 * using the strategy's canonical decimals. Returns an empty array when no
 * snapshots exist yet.
 */
export async function getStrategyNavHistory(
  params: GetStrategyNavHistoryParameters,
): Promise<IStrategyNavSnapshot[]> {
  const {
    strategy,
    strategyId,
    walletJwt,
    startTime,
    endTime,
    env,
    chainId: requestedChainId,
  } = params;
  const { chainId, address, decimals } = resolveStrategy({
    env,
    strategyId,
    strategy,
    chainId: requestedChainId,
  });

  const { baseApiUrl } = getApiConfig(env);
  const blockchain = getVaultBlockchainParam(chainId);

  const query = new URLSearchParams({ blockchain });
  if (startTime) query.set('start_time', startTime.toISOString());
  if (endTime) query.set('end_time', endTime.toISOString());

  const url = `${baseApiUrl.replace(/\/$/, '')}/v2/vaults/strategies/${address}/nav-history?${query.toString()}`;
  const raw = await userAuthorizedGet<IRawNavHistoryResponse>(url, walletJwt);

  const divisor = new BigNumber(10).pow(decimals);
  return (raw?.snapshots ?? []).map((s) => ({
    timestamp: s.timestamp ? new Date(s.timestamp) : new Date(0),
    nav: new BigNumber(s.nav ?? '0').div(divisor),
    pricePerShare: new BigNumber(s.pps ?? '0').div(divisor),
  }));
}
