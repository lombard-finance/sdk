/**
 * Solana Redeem Factory Functions
 *
 * @module chains/solana/actions/withdraw-btcb/factory
 */

import type { SolanaCoreContext } from '../../../../shared/context';
import { SolanaWithdrawBtcb } from './SolanaWithdrawBtcb';
import type { ISolanaWithdrawBtcb, SolanaWithdrawBtcbParams } from './types';

export function createSolanaRedeem(
  ctx: SolanaCoreContext,
  params: SolanaWithdrawBtcbParams,
): ISolanaWithdrawBtcb {
  return new SolanaWithdrawBtcb(ctx, params);
}
