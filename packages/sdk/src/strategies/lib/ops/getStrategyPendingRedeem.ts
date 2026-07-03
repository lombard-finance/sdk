import { Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { resolveStrategy } from '../config';
import { StrategyBaseParameters } from '../params';
import { IStrategyPendingRedeem } from '../types';

export interface GetStrategyPendingRedeemParameters
  extends StrategyBaseParameters {
  /** Request id returned by `requestStrategyRedeem` / emitted in `RedeemRequested`. */
  requestId: bigint;
}

/**
 * Reads a single in-flight redeem request by id. Returns the pending
 * shares, the operator-promised base-asset units, and the owner address.
 *
 * Once the operator fulfills the request, `pendingShares` and
 * `pendingAssets` go to zero. Callers can poll this to detect settlement.
 */
export async function getStrategyPendingRedeem({
  rpcUrl,
  strategy,
  strategyId,
  requestId,
  env,
}: GetStrategyPendingRedeemParameters): Promise<IStrategyPendingRedeem> {
  const { chainId, address, abi } = resolveStrategy({
    env,
    strategyId,
    strategy,
  });

  const client = makePublicClient({ chainId, rpcUrl, env });
  const raw = (await client.readContract({
    address,
    abi,
    functionName: 'pendingRedeemRequest',
    args: [requestId],
  })) as {
    pendingShares: bigint;
    pendingAssets: bigint;
    owner: Address;
  };

  return {
    requestId,
    pendingShares: raw.pendingShares,
    pendingAssets: raw.pendingAssets,
    owner: raw.owner,
  };
}
