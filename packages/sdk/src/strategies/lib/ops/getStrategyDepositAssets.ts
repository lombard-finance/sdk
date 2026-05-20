import { Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import {
  findStaticDepositAsset,
  LOMBARD_STRATEGY,
  LOMBARD_STRATEGY_DEPOSIT_ASSETS,
} from '../config';
import { IStrategyDepositAsset } from '../types';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';

export interface GetStrategyDepositAssetsParameters extends IEnvParam {
  chainId: ChainId;
  rpcUrl?: string;
  strategy?: Address;
  /**
   * Optional set of candidate token addresses to probe. Defaults to the
   * static catalog for the chain. Useful when callers want to validate
   * a backend-supplied list against the on-chain truth.
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
  chainId,
  rpcUrl,
  strategy,
  candidates,
  env,
}: GetStrategyDepositAssetsParameters): Promise<IStrategyDepositAsset[]> {
  assertLombardStrategyChain(chainId);
  const address = resolveStrategyAddress(chainId, strategy);

  const tokens =
    candidates ?? LOMBARD_STRATEGY_DEPOSIT_ASSETS[chainId].map((a) => a.token);
  if (tokens.length === 0) {
    return [];
  }

  const client = makePublicClient({ chainId, rpcUrl, env });

  const contracts = tokens.flatMap((token) => [
    {
      address,
      abi: LOMBARD_STRATEGY.abi,
      functionName: 'isDepositAsset',
      args: [token],
    },
    {
      address,
      abi: LOMBARD_STRATEGY.abi,
      functionName: 'converterOf',
      args: [token],
    },
    {
      address,
      abi: LOMBARD_STRATEGY.abi,
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
    const isDepositAssetResult = results[i * 3];
    const converterResult = results[i * 3 + 1];
    const feeResult = results[i * 3 + 2];

    if (
      isDepositAssetResult.status !== 'success' ||
      converterResult.status !== 'success' ||
      feeResult.status !== 'success'
    ) {
      continue;
    }
    if (isDepositAssetResult.result !== true) {
      continue;
    }

    const meta = findStaticDepositAsset(chainId, token);
    if (!meta) {
      // Skip live-listed tokens we have no catalog metadata for; UI cannot
      // display them without symbol/decimals.
      continue;
    }

    out.push({
      token,
      converter: converterResult.result as Address,
      symbol: meta.symbol,
      decimals: meta.decimals,
      depositFeeBps: Number(feeResult.result as number),
    });
  }

  return out;
}
