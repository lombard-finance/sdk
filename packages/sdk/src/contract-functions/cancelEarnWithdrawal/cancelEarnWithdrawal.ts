import { Hash } from 'viem';

import { CommonWriteParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import {
  BoringWithdrawRequest,
  cancelWithdrawInternal,
} from '../../vaults/lib/ops/withdraw';
import { EarnWithdrawQueue } from '../withdrawEarn/withdrawEarn';

export type CancelEarnWithdrawalParameters = {
  /** The withdrawal asset originally queued. Defaults to Token.LBTC. */
  withdrawalAsset?: Token;
  /**
   * Which queue the request lives on. Defaults to `'atomic'`; pass `'boring'`
   * to cancel a BoringOnChainQueue request.
   */
  queue?: EarnWithdrawQueue;
  /**
   * BoringQueue request struct — REQUIRED when `queue` is `'boring'`. Sourced
   * from the boringQueue status response (`Request.metadata`).
   */
  request?: BoringWithdrawRequest;
} & CommonWriteParameters;

/**
 * Cancels a pending Earn withdrawal request filed via `withdrawEarn`.
 *
 * AtomicQueue (default): cancellation zeroes the request, indexed per
 * (user, vault, withdrawalAsset) tuple, so the asset must match what was
 * queued.
 *
 * BoringQueue (`queue: 'boring'`): calls `cancelOnChainWithdraw(request)`,
 * which matches on the full request struct — pass the `request` from the
 * status response.
 *
 * @returns {Promise<Hash>} The cancel transaction hash.
 */
export async function cancelEarnWithdrawal({
  withdrawalAsset = Token.LBTC,
  queue = 'atomic',
  request,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
}: CancelEarnWithdrawalParameters): Promise<Hash> {
  return cancelWithdrawInternal({
    token: withdrawalAsset,
    queue,
    request,
    account,
    chainId,
    provider,
    rpcUrl,
    env,
  });
}
