import BigNumber from 'bignumber.js';

import { IStrategyUserPosition } from '../types';
import {
  BaseUserStrategyParams,
  resolveUserStrategyEndpoint,
  userAuthorizedGet,
} from './userEndpoints';

export type GetUserPositionParameters = BaseUserStrategyParams;

interface IRawUserPosition {
  shares?: string;
  base_asset_value?: string;
  pending_base_asset?: string;
  first_deposited_at?: string;
  principal_btc?: string;
  accrued_yield_btc?: string;
  deposits_count?: number;
}

/**
 * Fetches a derived per-user position snapshot from the vault-manager
 * (`GET /v2/vault/strategies/{address}/users/{owner}/position`).
 *
 * `shares` / `baseAssetValue` are live; `principalBtc` / `accruedYieldBtc`
 * are reconstructed from indexed events server-side. P2P share transfers
 * are NOT tracked — accounts that moved shares between wallets will see
 * drift in the principal / yield fields.
 */
export async function getUserPosition(
  params: GetUserPositionParameters,
): Promise<IStrategyUserPosition> {
  const { root, blockchain } = resolveUserStrategyEndpoint(params);

  const url = `${root}/position?blockchain=${blockchain}`;
  const raw = await userAuthorizedGet<IRawUserPosition>(url, params.walletJwt);

  return {
    shares: new BigNumber(raw?.shares ?? '0'),
    baseAssetValue: new BigNumber(raw?.base_asset_value ?? '0'),
    pendingBaseAsset: new BigNumber(raw?.pending_base_asset ?? '0'),
    firstDepositedAt: raw?.first_deposited_at
      ? new Date(raw.first_deposited_at)
      : undefined,
    principalBtc: new BigNumber(raw?.principal_btc ?? '0'),
    accruedYieldBtc: new BigNumber(raw?.accrued_yield_btc ?? '0'),
    depositsCount: raw?.deposits_count ?? 0,
  };
}
