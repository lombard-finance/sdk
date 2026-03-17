/**
 * Solana Stake Factory Functions
 *
 * @module chains/solana/actions/stake/factory
 */

import type { SolanaCoreContext } from '../../../../shared/context';
import { SolanaStake } from './SolanaStake';
import type { ISolanaStake, SolanaStakeParams } from './types';

export function createSolanaStake(
  ctx: SolanaCoreContext,
  params: SolanaStakeParams,
): ISolanaStake {
  return new SolanaStake(ctx, params);
}
