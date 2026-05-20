import BigNumber from 'bignumber.js';
import { Address, isAddress } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import { fromBaseDenomination } from '../../../tokens/tokens';
import { LOMBARD_STRATEGY, LOMBARD_STRATEGY_DECIMALS } from '../config';
import { IStrategyPosition } from '../types';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';

export interface GetStrategyPositionParameters extends IEnvParam {
  chainId: ChainId;
  rpcUrl?: string;
  /**
   * The account whose position should be read.
   */
  account: Address;
  /**
   * Strategy contract address. Defaults to the canonical address for the
   * chain.
   */
  strategy?: Address;
}

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
  chainId,
  rpcUrl,
  account,
  strategy,
  env,
}: GetStrategyPositionParameters): Promise<IStrategyPosition> {
  assertLombardStrategyChain(chainId);
  if (!isAddress(account)) {
    throw new Error(`Invalid account address: ${account}`);
  }
  const address = resolveStrategyAddress(chainId, strategy);

  const client = makePublicClient({ chainId, rpcUrl, env });

  const [sharesRaw, pendingAssetsRaw, pricePerShareRaw, decimalsRaw] =
    (await client.multicall({
      allowFailure: false,
      contracts: [
        {
          address,
          abi: LOMBARD_STRATEGY.abi,
          functionName: 'balanceOf',
          args: [account],
        },
        {
          address,
          abi: LOMBARD_STRATEGY.abi,
          functionName: 'pendingAssetsOf',
          args: [account],
        },
        {
          address,
          abi: LOMBARD_STRATEGY.abi,
          functionName: 'pricePerShare',
        },
        {
          address,
          abi: LOMBARD_STRATEGY.abi,
          functionName: 'decimals',
        },
      ],
    })) as readonly [bigint, bigint, bigint, number];

  const decimals = Number(decimalsRaw) || LOMBARD_STRATEGY_DECIMALS;

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
