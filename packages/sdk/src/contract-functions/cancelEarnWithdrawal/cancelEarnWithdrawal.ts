import { Hash } from 'viem';

import { CommonWriteParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import { cancelWithdrawInternal } from '../../vaults/lib/ops/withdraw';

export type CancelEarnWithdrawalParameters = {
  /** The withdrawal asset originally queued. Defaults to Token.LBTC. */
  withdrawalAsset?: Token;
} & CommonWriteParameters;

/**
 * Cancels a pending Earn withdrawal request filed via `withdrawEarn` (or the
 * legacy `queueWithdraw`).
 *
 * Atomic-request cancellation operates on the withdraw queue contract and is
 * indexed per (user, vault, withdrawalAsset) tuple, so the asset must match
 * what was originally queued. Defaults to Token.LBTC.
 *
 * @returns {Promise<Hash>} The cancel transaction hash.
 */
export async function cancelEarnWithdrawal({
  withdrawalAsset = Token.LBTC,
  account,
  chainId,
  provider,
  rpcUrl,
  env }: CancelEarnWithdrawalParameters): Promise<Hash> {
  return cancelWithdrawInternal({
    token: withdrawalAsset,
    account,
    chainId,
    provider,
    rpcUrl,
    env });
}
