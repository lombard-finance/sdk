/**
 * Solana Redeem Factory Functions
 *
 * @module chains/solana/actions/redeem/factory
 */

import type { SolanaCoreContext } from '../../../../shared/context';
import { SolanaRedeem } from './SolanaRedeem';
import type { ISolanaRedeem, SolanaRedeemParams } from './types';

export function createSolanaRedeem(
  ctx: SolanaCoreContext,
  params: SolanaRedeemParams,
): ISolanaRedeem {
  return new SolanaRedeem(ctx, params);
}
