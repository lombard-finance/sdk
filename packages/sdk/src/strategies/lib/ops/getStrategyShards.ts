import { Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { resolveStrategy } from '../config';
import { StrategyBaseParameters } from '../params';
import { IStrategyShards } from '../types';

export type GetStrategyShardsParameters = StrategyBaseParameters;

/**
 * Reads the Strategy's shard inventory: the full `shards()` array and the
 * current `defaultShard()`. Read-only; the depositor flow never targets a
 * shard directly. Surface this in a "where is my money parked" portfolio
 * view.
 */
export async function getStrategyShards({
  rpcUrl,
  strategy,
  strategyId,
  env,
  chainId: requestedChainId,
}: GetStrategyShardsParameters): Promise<IStrategyShards> {
  const { chainId, address, abi } = resolveStrategy({
    env,
    strategyId,
    strategy,
    chainId: requestedChainId,
  });

  const client = makePublicClient({ chainId, rpcUrl, env });
  const [shards, defaultShard] = (await client.multicall({
    allowFailure: false,
    contracts: [
      { address, abi, functionName: 'shards' },
      { address, abi, functionName: 'defaultShard' },
    ],
  })) as readonly [readonly Address[], Address];

  return {
    shards: [...shards],
    defaultShard,
  };
}
