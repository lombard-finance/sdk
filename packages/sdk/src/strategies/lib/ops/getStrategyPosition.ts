import BigNumber from 'bignumber.js';
import { isAddress } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { fromBaseDenomination } from '../../../tokens/tokens';
import { resolveStrategy } from '../config';
import { StrategyReadParameters } from '../params';
import { IStrategyPosition } from '../types';

export type GetStrategyPositionParameters = StrategyReadParameters;

/**
 * Reads a user's position on a Strategy: ERC-20 share balance, implied
 * base-asset value (shares * pricePerShare), and pending redeem total.
 *
 * The base-asset value is a headline number suitable for UI display;
 * call `convertToAssets` directly for precise quoting (e.g. when sizing a
 * redeem request) since the Strategy can apply per-asset haircuts and
 * accrued fees the headline price does not reflect.
 */
export async function getStrategyPosition({
  rpcUrl,
  account,
  strategy,
  strategyId,
  env,
  chainId: requestedChainId,
}: GetStrategyPositionParameters): Promise<IStrategyPosition> {
  if (!isAddress(account)) {
    throw new Error(`Invalid account address: ${account}`);
  }
  const {
    chainId,
    address,
    abi,
    decimals: defaultDecimals,
  } = resolveStrategy({ env, strategyId, strategy, chainId: requestedChainId });

  const client = makePublicClient({ chainId, rpcUrl, env });

  const [sharesRaw, pendingAssetsRaw, pricePerShareRaw, decimalsRaw] =
    (await client.multicall({
      allowFailure: false,
      contracts: [
        {
          address,
          abi,
          functionName: 'balanceOf',
          args: [account],
        },
        {
          address,
          abi,
          functionName: 'pendingAssetsOf',
          args: [account],
        },
        {
          address,
          abi,
          functionName: 'pricePerShare',
        },
        {
          address,
          abi,
          functionName: 'decimals',
        },
      ],
    })) as readonly [bigint, bigint, bigint, number];

  // Fall back only when the on-chain value is missing/unparsable — a valid 0
  // must NOT be coerced to the default (would mis-scale the amounts below).
  const parsedDecimals = Number(decimalsRaw);
  const decimals = Number.isFinite(parsedDecimals)
    ? parsedDecimals
    : defaultDecimals;

  const shares = fromBaseDenomination(sharesRaw.toString(), decimals);
  const pricePerShare = fromBaseDenomination(
    pricePerShareRaw.toString(),
    decimals,
  );
  const pendingBaseAsset = fromBaseDenomination(
    pendingAssetsRaw.toString(),
    decimals,
  );

  return {
    sharesRaw,
    shares,
    baseAssetValue: shares
      .multipliedBy(pricePerShare)
      .decimalPlaces(decimals, BigNumber.ROUND_DOWN),
    pendingBaseAsset,
  };
}
