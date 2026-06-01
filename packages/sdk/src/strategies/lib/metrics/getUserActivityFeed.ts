import BigNumber from 'bignumber.js';
import { Address, Hash } from 'viem';

import { IStrategyUserActivityEntry } from '../types';
import {
  BaseUserStrategyParams,
  resolveUserStrategyEndpoint,
  userAuthorizedGet,
} from './userEndpoints';

export interface GetUserActivityFeedParameters extends BaseUserStrategyParams {
  /** Default backend pagination ceiling is 100. */
  limit?: number;
  offset?: number;
  /**
   * Filter by activity type (server-side). Omit to receive everything.
   * Multiple values widen the result set.
   */
  types?: Array<'deposit' | 'redeem_requested' | 'redeem_fulfilled'>;
}

interface IRawUserActivityEntry {
  activity_type?: string;
  block_time?: string;
  tx_hash?: string;
  block_height?: string;
  log_index?: number;
  asset?: Address;
  asset_symbol?: string;
  amount?: string;
  status?: string;
  request_id?: string;
}

interface IRawUserActivityFeedResponse {
  activities?: ReadonlyArray<IRawUserActivityEntry>;
  total?: number;
}

/**
 * Fetches the user's deposit / redeem activity timeline for a strategy from
 * the vault-manager API (`GET /v2/vault/strategies/{address}/users/{owner}/activity`).
 *
 * Entries are returned in the backend's documented order (newest-first).
 * gRPC-Gateway zero/false elision is normalized so callers never need to
 * spread defaults inline.
 */
export async function getUserActivityFeed(
  params: GetUserActivityFeedParameters,
): Promise<IStrategyUserActivityEntry[]> {
  const { root, blockchain } = resolveUserStrategyEndpoint(params);

  const query = new URLSearchParams({ blockchain });
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.offset != null) query.set('offset', String(params.offset));
  if (params.types && params.types.length > 0) {
    for (const t of params.types) query.append('types', t);
  }

  const url = `${root}/activity?${query.toString()}`;
  const raw = await userAuthorizedGet<IRawUserActivityFeedResponse>(
    url,
    params.walletJwt,
  );
  return (raw?.activities ?? []).map(normalizeActivityEntry);
}

function normalizeActivityEntry(
  raw: IRawUserActivityEntry,
): IStrategyUserActivityEntry {
  const activityType = (raw.activity_type ?? 'deposit') as
    | 'deposit'
    | 'redeem_requested'
    | 'redeem_fulfilled';
  const status = (raw.status ?? '') as 'pending' | 'fulfilled' | '';
  return {
    activityType,
    blockTime: raw.block_time ? new Date(raw.block_time) : new Date(0),
    txHash: (raw.tx_hash ?? '0x') as Hash,
    blockHeight: raw.block_height ? BigInt(raw.block_height) : 0n,
    logIndex: raw.log_index ?? 0,
    asset: (raw.asset ?? '0x') as Address,
    assetSymbol: raw.asset_symbol ?? '',
    amount: new BigNumber(raw.amount ?? '0'),
    status,
    requestId: raw.request_id ? BigInt(raw.request_id) : undefined,
  };
}
