/**
 * The Earn vault holds one withdrawal request per account, and a second
 * request overwrites the first.
 *
 * The withdraw queue is an `AtomicQueue`. Its storage is
 * `userAtomicRequest[user][offer][want]`, holding a single
 * `(deadline, atomicPrice, offerAmount, inSolve)` struct — not a list, and
 * with no request id. `getUserAtomicRequest` returns one tuple. The only
 * mutating entry points are `updateAtomicRequest` and
 * `safeUpdateAtomicRequest`, and the event they emit is
 * `AtomicRequestUpdated`. Cancelling is the same call with a zeroed struct.
 *
 * So concurrent withdrawals are not something the vault refuses — they are
 * something it cannot represent. Filing a second request while one is open
 * does not revert: it replaces the first, and the shares the first had queued
 * are simply no longer queued. An account with 5 LBTC awaiting fulfilment that
 * files for 1 LBTC ends up with 1 LBTC queued and no record of the other 4.
 *
 * Nothing in the SDK read this before writing, so both withdrawal paths could
 * destroy a pending request with no failure and no warning. `withdrawEarn` is
 * the worse of the two: it may unwrap BTCe and grant an approval before the
 * queue write, so the loss could be preceded by transactions that cannot be
 * taken back.
 *
 * This module supplies the read and the guard. It is deliberately not a
 * product rule — the app separately declines to *deposit* while a withdrawal
 * is open, which is a UX choice with no counterpart in the contract, and is
 * not enforced here.
 *
 * ## Scoped to the AtomicQueue, on purpose
 *
 * Everything above is a property of `AtomicQueue` and of nothing else. The
 * `BoringOnChainQueue` submits with `requestOnChainWithdraw` and cancels with
 * `cancelOnChainWithdraw(request)` — a create, and a cancel that addresses one
 * request out of many — so concurrent requests are representable there and
 * none of this applies.
 *
 * Whoever adds the Boring path must therefore scope this guard to the atomic
 * queue rather than run it for both. Reading `getUserAtomicRequest` on a
 * Boring withdrawal would consult the wrong slot: empty, so it would wave
 * through anything, or stale from an old atomic request, so it would refuse a
 * withdrawal that has nothing to do with it.
 *
 * @module vaults/lib/ops/pending-withdrawal
 */

import BigNumber from 'bignumber.js';
import { Abi, Address, PublicClient } from 'viem';

import { fromBaseDenomination } from '../../../tokens/tokens';

/** An atomic request that already exists on the queue for an account. */
export type PendingEarnWithdrawal = {
  /** Vault shares committed to the request, in natural units. */
  shareAmount: BigNumber;
  /** Unix seconds past which a solver can no longer fulfil it. */
  deadline: number;
  /** True while a solver is part-way through fulfilling it. */
  inSolve: boolean;
  /**
   * Whether the request can still be fulfilled.
   *
   * An expired request still occupies the slot, but no solver can act on it,
   * so replacing it is the intended way to re-queue rather than a hazard.
   */
  isLive: boolean;
};

export type ReadPendingEarnWithdrawalParameters = {
  publicClient: PublicClient;
  /** The withdraw queue for this chain. */
  queueAddress: Address;
  queueAbi: Abi;
  /** The share token being offered — the vault contract. */
  offer: Address;
  /** The asset the account asked to receive. */
  want: Address;
  account: Address;
  /** Decimals of the share token, for the reported amount. */
  shareDecimals: number;
  /** Injectable for tests; defaults to the current time. */
  nowSeconds?: number;
};

/**
 * The account's existing request for this `offer`/`want` pair, or `null`.
 *
 * `null` means the slot is empty. A zero `offerAmount` is how both an
 * untouched slot and a cancelled request look, and the two are
 * indistinguishable on chain — which is fine, because neither blocks anything.
 */
export async function readPendingEarnWithdrawal({
  publicClient,
  queueAddress,
  queueAbi,
  offer,
  want,
  account,
  shareDecimals,
  nowSeconds,
}: ReadPendingEarnWithdrawalParameters): Promise<PendingEarnWithdrawal | null> {
  const request = (await publicClient.readContract({
    address: queueAddress,
    abi: queueAbi,
    functionName: 'getUserAtomicRequest',
    args: [account, offer, want],
  })) as {
    deadline: bigint;
    atomicPrice: bigint;
    offerAmount: bigint;
    inSolve: boolean;
  };

  if (!request || request.offerAmount === 0n) {
    return null;
  }

  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  const deadline = Number(request.deadline);

  return {
    shareAmount: fromBaseDenomination(
      String(request.offerAmount),
      shareDecimals,
    ),
    deadline,
    inSolve: request.inSolve,
    isLive: deadline > now,
  };
}

/**
 * Refuse to overwrite a request that can still be fulfilled.
 *
 * Throws rather than warns because the alternative is silent: the write
 * succeeds, so a caller who did not want this has no signal that anything was
 * lost. A caller who does want it says so with `replaceExisting`.
 *
 * Two cases are allowed through without it. An expired request cannot be
 * solved, so replacing it is the only way to re-queue. An empty slot is
 * nothing at all.
 */
export function assertNoLiveEarnWithdrawal(
  pending: PendingEarnWithdrawal | null,
  { replaceExisting = false }: { replaceExisting?: boolean } = {},
): void {
  if (!pending) return;

  // Mid-fulfilment. Overwriting here races a solver that has already committed
  // to this request, so it is refused even when replacement was asked for —
  // the caller cannot have meant this one, and cancelling is the way out.
  if (pending.inSolve) {
    throw new Error(
      `WithdrawalInSolveError: a withdrawal of ${pending.shareAmount.toFixed()} vault shares is being fulfilled right now, so it cannot be replaced. Wait for it to settle.`,
    );
  }

  if (!pending.isLive || replaceExisting) return;

  throw new Error(
    `PendingWithdrawalError: this account already has a withdrawal of ` +
      `${pending.shareAmount.toFixed()} vault shares queued until ` +
      `${new Date(pending.deadline * 1000).toISOString()}. The vault holds one ` +
      `request per account, so filing another would replace it and un-queue ` +
      `those shares. Cancel the open request first, or pass ` +
      `replaceExisting: true to overwrite it deliberately. No transactions sent.`,
  );
}
