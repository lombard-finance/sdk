import { Hash } from 'viem';

import { CommonWriteParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import {
  BoringWithdrawRequest,
  cancelWithdrawInternal,
} from '../../vaults/lib/ops/withdraw';
import { EarnWithdrawQueue } from '../withdrawEarn/withdrawEarn';

export type CancelEarnWithdrawalParameters = {
  /**
   * The withdrawal asset of an AtomicQueue request. Defaults to Token.LBTC.
   * Not read for the BoringQueue, whose request names its own asset.
   */
  withdrawalAsset?: Token;
  /**
   * Which queue the request lives on. Defaults to `'boring'`, where
   * `withdrawEarn` files every request. Pass `'atomic'` only to cancel a
   * request filed before 6.0.0.
   */
  queue?: EarnWithdrawQueue;
  /**
   * The request to cancel, required for the BoringQueue: the `request` of an
   * open or expired withdrawal from `getEarnWithdrawals`.
   */
  request?: BoringWithdrawRequest;
} & CommonWriteParameters;

/**
 * Cancels a pending Earn withdrawal request filed via `withdrawEarn`.
 *
 * BoringQueue (default): calls `cancelOnChainWithdraw(request)`, which
 * matches on the full request struct, so pass the `request` that
 * `getEarnWithdrawals` reports on the withdrawal.
 *
 * AtomicQueue (`queue: 'atomic'`): for a request filed before 6.0.0, which
 * `getEarnWithdrawals` does not report. Cancellation zeroes the request,
 * indexed per (user, vault, withdrawalAsset), so the asset must match what
 * was queued.
 *
 * @returns {Promise<Hash>} The cancel transaction hash.
 */
export async function cancelEarnWithdrawal({
  withdrawalAsset = Token.LBTC,
  queue = 'boring',
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
