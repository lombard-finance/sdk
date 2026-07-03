import { Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { fromBaseDenomination } from '../../../tokens/tokens';
import { resolveStrategy } from '../config';
import { StrategyBaseParameters } from '../params';
import { IStrategyState } from '../types';

export type GetStrategyStateParameters = StrategyBaseParameters;

const NO_ARG_VIEWS = [
  'paused',
  'depositPaused',
  'redeemPaused',
  'name',
  'symbol',
  'decimals',
  'asset',
  'pricePerShare',
  'totalAssets',
  'totalSupply',
  'totalPending',
  'managementFee',
  'performanceFee',
  'redeemFee',
] as const;

/**
 * Reads a full on-chain snapshot of the Strategy in one batched roundtrip.
 *
 * Issues a single multicall covering the three pause flags, share metadata,
 * price-per-share, total assets/supply/pending, and the three fee bps values.
 * Throws if any field reverts so the caller never has to reason about
 * partial state.
 */
export async function getStrategyState({
  rpcUrl,
  strategy,
  strategyId,
  env,
  chainId: requestedChainId,
}: GetStrategyStateParameters): Promise<IStrategyState> {
  const {
    chainId,
    address,
    abi,
    decimals: defaultDecimals,
  } = resolveStrategy({ env, strategyId, strategy, chainId: requestedChainId });

  const client = makePublicClient({ chainId, rpcUrl, env });

  const results = await client.multicall({
    allowFailure: false,
    contracts: NO_ARG_VIEWS.map((functionName) => ({
      address,
      abi,
      functionName,
    })),
  });

  const [
    paused,
    depositPaused,
    redeemPaused,
    name,
    symbol,
    decimalsRaw,
    baseAssetAddress,
    pricePerShareRaw,
    totalAssetsRaw,
    totalSupplyRaw,
    totalPendingRaw,
    managementFee,
    performanceFee,
    redeemFeeBpsRaw,
  ] = results as unknown as readonly [
    boolean,
    boolean,
    boolean,
    string,
    string,
    number,
    Address,
    bigint,
    bigint,
    bigint,
    readonly [bigint, bigint],
    readonly [number, number, Address],
    readonly [number, bigint, bigint],
    number,
  ];

  // Fall back only when the on-chain value is missing/unparsable — a valid 0
  // must NOT be coerced to the default (would mis-scale every amount below).
  const parsedDecimals = Number(decimalsRaw);
  const decimals = Number.isFinite(parsedDecimals)
    ? parsedDecimals
    : defaultDecimals;

  return {
    paused,
    depositPaused,
    redeemPaused,
    name,
    symbol,
    decimals,
    baseAssetAddress,
    pricePerShare: fromBaseDenomination(pricePerShareRaw.toString(), decimals),
    totalAssets: fromBaseDenomination(totalAssetsRaw.toString(), decimals),
    totalShares: fromBaseDenomination(totalSupplyRaw.toString(), decimals),
    totalPending: {
      shares: fromBaseDenomination(totalPendingRaw[0].toString(), decimals),
      assets: fromBaseDenomination(totalPendingRaw[1].toString(), decimals),
    },
    managementFeeBps: Number(managementFee[0]),
    performanceFeeBps: Number(performanceFee[0]),
    redeemFeeBps: Number(redeemFeeBpsRaw),
  };
}
