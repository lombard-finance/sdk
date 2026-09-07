/**
 * Solana Stake Factory Functions
 *
 * @module chains/solana/actions/deposit-btcb/factory
 */

import type { SolanaCoreContext } from '../../../../shared/context';
import { SolanaDepositBtcb } from './SolanaDepositBtcb';
import type { ISolanaDepositBtcb, SolanaDepositBtcbParams } from './types';

export function createSolanaStake(
  ctx: SolanaCoreContext,
  params: SolanaDepositBtcbParams,
): ISolanaDepositBtcb {
  return new SolanaDepositBtcb(ctx, params);
}
