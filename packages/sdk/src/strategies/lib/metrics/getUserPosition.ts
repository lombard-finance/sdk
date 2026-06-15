import BigNumber from 'bignumber.js';

import { IStrategyUserPosition } from '../types';
import {
  BaseUserStrategyParams,
  resolveUserStrategyEndpoint,
  userAuthorizedGet,
} from './userEndpoints';

export type GetUserPositionParameters = BaseUserStrategyParams;

interface IRawUserPositionData {
  shares?: string;
  base_asset_value?: string;
  pending_base_asset?: string;
  first_deposited_at?: string;
  principal_btc?: string;
  accrued_yield_btc?: string;
  deposits_count?: number;
}

interface IRawUserPosition {
  position?: IRawUserPositionData;
}

/**
 * Fetches a derived per-user position snapshot from the vault-manager
 * (`GET /v2/vaults/strategies/{address}/users/{owner}/position`).
 *
 * `shares` / `baseAssetValue` are live; `principalBtc` / `accruedYieldBtc`
 * are reconstructed from indexed events server-side. P2P share transfers
 * are NOT tracked — accounts that moved shares between wallets will see
 * drift in the principal / yield fields.
 */
export async function getStrategyUserPosition(
  params: GetUserPositionParameters,
): Promise<IStrategyUserPosition> {
  const { root, blockchain } = resolveUserStrategyEndpoint(params);

  const url = `${root}/position?blockchain=${blockchain}`;
  const raw = await userAuthorizedGet<IRawUserPosition>(url, params.env);
  const position = raw?.position;

  return {
    shares: new BigNumber(position?.shares ?? '0'),
    baseAssetValue: new BigNumber(position?.base_asset_value ?? '0'),
    pendingBaseAsset: new BigNumber(position?.pending_base_asset ?? '0'),
    firstDepositedAt: position?.first_deposited_at
      ? new Date(position.first_deposited_at)
      : undefined,
    principalBtc: new BigNumber(position?.principal_btc ?? '0'),
    accruedYieldBtc: new BigNumber(position?.accrued_yield_btc ?? '0'),
    depositsCount: position?.deposits_count ?? 0,
  };
}
