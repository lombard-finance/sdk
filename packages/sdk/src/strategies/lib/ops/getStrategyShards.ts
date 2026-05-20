import { Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import { LOMBARD_STRATEGY } from '../config';
import { IStrategyShards } from '../types';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';

export interface GetStrategyShardsParameters extends IEnvParam {
  chainId: ChainId;
  rpcUrl?: string;
  strategy?: Address;
}

/**
 * Reads the Strategy's shard inventory: the full `shards()` array and the
 * current `defaultShard()`. Read-only; the depositor flow never targets a
 * shard directly. Surface this in a "where is my money parked" portfolio
 * view.
 */
export async function getStrategyShards({
  chainId,
  rpcUrl,
  strategy,
  env,
}: GetStrategyShardsParameters): Promise<IStrategyShards> {
  assertLombardStrategyChain(chainId);
  const address = resolveStrategyAddress(chainId, strategy);

  const client = makePublicClient({ chainId, rpcUrl, env });
  const [shards, defaultShard] = (await client.multicall({
    allowFailure: false,
    contracts: [
      { address, abi: LOMBARD_STRATEGY.abi, functionName: 'shards' },
      { address, abi: LOMBARD_STRATEGY.abi, functionName: 'defaultShard' },
    ],
  })) as readonly [readonly Address[], Address];

  return {
    shards: [...shards],
    defaultShard,
  };
}
