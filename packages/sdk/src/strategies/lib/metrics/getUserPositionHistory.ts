import BigNumber from 'bignumber.js';

import { IStrategyUserPositionSnapshot } from '../types';
import {
  BaseUserStrategyParams,
  resolveUserStrategyEndpoint,
  userAuthorizedGet,
} from './userEndpoints';

export interface GetUserPositionHistoryParameters
  extends BaseUserStrategyParams {
  /** Inclusive lower bound. Backend defaults to "since first deposit". */
  startTime?: Date;
  /** Inclusive upper bound. Backend defaults to "now". */
  endTime?: Date;
}

interface IRawSnapshot {
  timestamp?: string;
  shares?: string;
  base_asset_value?: string;
}

interface IRawUserPositionHistory {
  snapshots?: ReadonlyArray<IRawSnapshot>;
}

/**
 * Fetches a time-series of the user's position value (shares × pps) from
 * the vault-manager (`GET /v2/vault/strategies/{address}/users/{owner}/position-history`).
 *
 * Snapshot cadence is backend-defined (typically once per PPS update or
 * once per UTC day, whichever is sparser). The series is suitable for a
 * value-over-time sparkline / chart on the position card.
 */
export async function getUserPositionHistory(
  params: GetUserPositionHistoryParameters,
): Promise<IStrategyUserPositionSnapshot[]> {
  const { root, blockchain } = resolveUserStrategyEndpoint(params);

  const query = new URLSearchParams({ blockchain });
  if (params.startTime) query.set('start_time', params.startTime.toISOString());
  if (params.endTime) query.set('end_time', params.endTime.toISOString());

  const url = `${root}/position-history?${query.toString()}`;
  const raw = await userAuthorizedGet<IRawUserPositionHistory>(
    url,
    params.walletJwt,
  );

  return (raw?.snapshots ?? []).map((s) => ({
    timestamp: s.timestamp ? new Date(s.timestamp) : new Date(0),
    shares: new BigNumber(s.shares ?? '0'),
    baseAssetValue: new BigNumber(s.base_asset_value ?? '0'),
  }));
}
