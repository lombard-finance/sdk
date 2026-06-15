import BigNumber from 'bignumber.js';
import { Address, Hash } from 'viem';

import { IStrategyUserWithdrawalRequest } from '../types';
import {
  BaseUserStrategyParams,
  resolveUserStrategyEndpoint,
  userAuthorizedGet,
} from './userEndpoints';

export interface GetUserWithdrawalsParameters extends BaseUserStrategyParams {
  /** Include already-fulfilled requests. Defaults to `false` (pending-only). */
  includeFulfilled?: boolean;
}

interface IRawUserWithdrawal {
  request_id?: string;
  owner?: Address;
  assets?: string;
  shares?: string;
  requested_at?: string;
  request_tx?: string;
  pps_at_request?: string;
  expires_at?: string;
  status?: string;
  fulfilled_at?: string;
  fulfill_tx?: string;
}

interface IRawUserWithdrawalsResponse {
  requests?: ReadonlyArray<IRawUserWithdrawal>;
}

/**
 * Fetches the user's redeem requests (pending by default; pass
 * `includeFulfilled` to see settled history too) from the vault-manager
 * (`GET /v2/vaults/strategies/{address}/users/{owner}/withdrawals`).
 */
export async function getUserWithdrawals(
  params: GetUserWithdrawalsParameters,
): Promise<IStrategyUserWithdrawalRequest[]> {
  const { root, blockchain } = resolveUserStrategyEndpoint(params);

  const query = new URLSearchParams({ blockchain });
  if (params.includeFulfilled) {
    query.set('include_fulfilled', 'true');
  }

  const url = `${root}/withdrawals?${query.toString()}`;
  const raw = await userAuthorizedGet<IRawUserWithdrawalsResponse>(
    url,
    params.env,
  );
  return (raw?.requests ?? []).map(normalizeWithdrawal);
}

function normalizeWithdrawal(
  raw: IRawUserWithdrawal,
): IStrategyUserWithdrawalRequest {
  const status = (raw.status === 'fulfilled' ? 'fulfilled' : 'pending') as
    | 'pending'
    | 'fulfilled';
  return {
    requestId: raw.request_id ? BigInt(raw.request_id) : 0n,
    owner: (raw.owner ?? '0x') as Address,
    assets: new BigNumber(raw.assets ?? '0'),
    shares: new BigNumber(raw.shares ?? '0'),
    requestedAt: raw.requested_at ? new Date(raw.requested_at) : new Date(0),
    requestTx: (raw.request_tx ?? '0x') as Hash,
    ppsAtRequest: raw.pps_at_request
      ? new BigNumber(raw.pps_at_request)
      : undefined,
    expiresAt: raw.expires_at ? new Date(raw.expires_at) : undefined,
    status,
    fulfilledAt: raw.fulfilled_at ? new Date(raw.fulfilled_at) : undefined,
    fulfillTx: raw.fulfill_tx ? (raw.fulfill_tx as Hash) : undefined,
  };
}
