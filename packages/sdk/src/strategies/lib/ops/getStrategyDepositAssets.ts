import { Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { findStaticDepositAsset, resolveStrategy } from '../config';
import { StrategyBaseParameters } from '../params';
import { IStrategyDepositAsset } from '../types';

export interface GetStrategyDepositAssetsParameters extends StrategyBaseParameters {
  /**
   * Optional set of candidate token addresses to probe. Defaults to the
   * static catalog for the resolved deployment. Useful when callers want to
   * validate a backend-supplied list against the on-chain truth.
   */
  candidates?: ReadonlyArray<Address>;
}

/**
 * Returns the live list of deposit assets the Strategy currently accepts.
 *
 * Probes `isDepositAsset` + `converterOf` + `depositFee` for each candidate
 * in a single multicall, then joins with the static catalog to recover the
 * symbol / decimals the contract does not store. Assets that report
 * `isDepositAsset = false` or are missing from the static catalog are
 * dropped.
 */
export async function getStrategyDepositAssets({
  rpcUrl,
  strategy,
  strategyId,
  candidates,
  env,
  chainId: requestedChainId,
}: GetStrategyDepositAssetsParameters): Promise<IStrategyDepositAsset[]> {
  const { chainId, address, abi, depositAssets } = resolveStrategy({
    env,
    strategyId,
    strategy,
    chainId: requestedChainId,
  });

  const tokens = candidates ?? depositAssets.map((a) => a.token);
  if (tokens.length === 0) {
    return [];
  }

  const client = makePublicClient({ chainId, rpcUrl, env });

  const contracts = tokens.flatMap((token) => [
    {
      address,
      abi,
      functionName: 'isDepositAsset',
      args: [token],
    },
    {
      address,
      abi,
      functionName: 'depositFee',
      args: [token],
    },
  ]);

  const results = await client.multicall({
    allowFailure: true,
    contracts,
  });

  const out: IStrategyDepositAsset[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isDepositAssetResult = results[i * 2];
    const feeResult = results[i * 2 + 1];

    if (
      isDepositAssetResult.status !== 'success' ||
      feeResult.status !== 'success'
    ) {
      continue;
    }
    if (isDepositAssetResult.result !== true) {
      continue;
    }

    const meta = findStaticDepositAsset(depositAssets, token);
    if (!meta) {
      // Skip live-listed tokens we have no catalog metadata for; UI cannot
      // display them without symbol/decimals.
      continue;
    }

    out.push({
      token,
      symbol: meta.symbol,
      decimals: meta.decimals,
      depositFeeBps: Number(feeResult.result as number),
    });
  }

  return out;
}
