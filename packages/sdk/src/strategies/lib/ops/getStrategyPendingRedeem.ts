import { Address } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import { LOMBARD_STRATEGY } from '../config';
import { IStrategyPendingRedeem } from '../types';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';

export interface GetStrategyPendingRedeemParameters extends IEnvParam {
  chainId: ChainId;
  rpcUrl?: string;
  strategy?: Address;
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
  chainId,
  rpcUrl,
  strategy,
  requestId,
  env,
}: GetStrategyPendingRedeemParameters): Promise<IStrategyPendingRedeem> {
  assertLombardStrategyChain(chainId);
  const address = resolveStrategyAddress(chainId, strategy);

  const client = makePublicClient({ chainId, rpcUrl, env });
  const raw = (await client.readContract({
    address,
    abi: LOMBARD_STRATEGY.abi,
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
