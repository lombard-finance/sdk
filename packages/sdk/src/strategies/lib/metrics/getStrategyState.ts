import { Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import { fromBaseDenomination } from '../../../tokens/tokens';
import { LOMBARD_STRATEGY, LOMBARD_STRATEGY_DECIMALS } from '../config';
import { IStrategyState } from '../types';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';

export interface GetStrategyStateParameters extends IEnvParam {
  chainId: ChainId;
  rpcUrl?: string;
  /**
   * Strategy contract address. Defaults to the canonical address for the
   * chain (e.g. Bitcoin Stretch on Base Sepolia).
   */
  strategy?: Address;
}

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
  chainId,
  rpcUrl,
  strategy,
  env,
}: GetStrategyStateParameters): Promise<IStrategyState> {
  assertLombardStrategyChain(chainId);
  const address = resolveStrategyAddress(chainId, strategy);

  const client = makePublicClient({ chainId, rpcUrl, env });

  const results = await client.multicall({
    allowFailure: false,
    contracts: NO_ARG_VIEWS.map((functionName) => ({
      address,
      abi: LOMBARD_STRATEGY.abi,
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

  const decimals = Number(decimalsRaw) || LOMBARD_STRATEGY_DECIMALS;

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
