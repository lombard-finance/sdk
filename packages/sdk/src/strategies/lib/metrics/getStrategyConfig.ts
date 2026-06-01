import axios from 'axios';
import { Address, zeroAddress } from 'viem';

import { getApiConfig } from '../../../common/api-config';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import {
  IStrategyAllocationRow,
  IStrategyConfigResponse,
  IStrategyDepositAsset,
  IStrategyFeeConfig,
} from '../types';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';

export interface GetStrategyConfigParameters extends IEnvParam {
  chainId: ChainId;
  strategy?: Address;
}

/**
 * Wire-format payload from the vault-manager API. gRPC-Gateway omits
 * zero/false scalar fields, so all top-level fields are typed as optional
 * and normalized by `normalizeStrategyConfig`.
 */
interface IRawStrategyConfig {
  name?: string;
  symbol?: string;
  decimals?: number;
  base_asset?: {
    address?: Address;
    symbol?: string;
    decimals?: number;
  };
  deposit_assets?: ReadonlyArray<{
    token?: Address;
    converter?: Address;
    symbol?: string;
    decimals?: number;
    deposit_fee_bps?: number;
  }>;
  shards?: ReadonlyArray<Address>;
  default_shard?: Address;
  fee_config?: {
    management_fee_bps?: number;
    performance_fee_bps?: number;
    redeem_fee_bps?: number;
  };
  withdrawal_target_seconds?: number;
  allocations?: ReadonlyArray<{
    id?: string;
    allocation?: string;
    collateral?: string;
    debt?: string;
    protocol?: string;
    active_position?: string;
  }>;
  apy?: string;
  tvl_base_asset?: string;
}

/**
 * Fetches and normalizes the Strategy config from the vault-manager API
 * (`GET /api/v1/strategies/{strategy}/config`).
 *
 * Normalization step: gRPC-Gateway elides zero/false scalars, so a fee of
 * `0 bps` arrives as missing. This function defaults missing scalars to
 * sane zero/empty values so the consumer never has to spread defaults
 * inline.
 */
export async function getStrategyConfig({
  chainId,
  strategy,
  env,
}: GetStrategyConfigParameters): Promise<IStrategyConfigResponse> {
  assertLombardStrategyChain(chainId);
  const address = resolveStrategyAddress(chainId, strategy);

  const { baseApiV2Url } = getApiConfig(env);
  const url = `${baseApiV2Url.replace(/\/$/, '')}/api/v1/strategies/${address}/config`;

  const { data } = await axios.get<IRawStrategyConfig>(url);
  return normalizeStrategyConfig(data);
}

export function normalizeStrategyConfig(
  raw: IRawStrategyConfig | undefined,
): IStrategyConfigResponse {
  const baseAsset = raw?.base_asset ?? {};
  const feeConfig = raw?.fee_config ?? {};

  const depositAssets: IStrategyDepositAsset[] = (raw?.deposit_assets ?? [])
    .filter(
      (a): a is Required<NonNullable<typeof a>> =>
        !!a && !!a.token && !!a.converter,
    )
    .map((a) => ({
      token: a.token,
      converter: a.converter,
      symbol: a.symbol ?? '',
      decimals: a.decimals ?? 0,
      depositFeeBps: a.deposit_fee_bps ?? 0,
    }));

  const allocations: IStrategyAllocationRow[] = (raw?.allocations ?? [])
    .filter((a) => !!a)
    .map((a) => ({
      id: a?.id ?? '',
      allocation: a?.allocation ?? '',
      collateral: a?.collateral ?? '',
      debt: a?.debt ?? '',
      protocol: a?.protocol ?? '',
      activePosition: a?.active_position ?? '',
    }));

  const normalizedFeeConfig: IStrategyFeeConfig = {
    managementFeeBps: feeConfig.management_fee_bps ?? 0,
    performanceFeeBps: feeConfig.performance_fee_bps ?? 0,
    redeemFeeBps: feeConfig.redeem_fee_bps ?? 0,
  };

  return {
    name: raw?.name ?? '',
    symbol: raw?.symbol ?? '',
    decimals: raw?.decimals ?? 0,
    baseAsset: {
      address: baseAsset.address ?? zeroAddress,
      symbol: baseAsset.symbol ?? '',
      decimals: baseAsset.decimals ?? 0,
    },
    depositAssets,
    shards: [...(raw?.shards ?? [])],
    defaultShard: raw?.default_shard,
    feeConfig: normalizedFeeConfig,
    withdrawalTargetSeconds: raw?.withdrawal_target_seconds ?? 0,
    allocations: allocations.length > 0 ? allocations : undefined,
    apy: raw?.apy,
    tvlBaseAsset: raw?.tvl_base_asset,
  };
}
