/**
 * Solana Stake Factory Functions
 *
 * @module chains/solana/actions/stake/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { SolanaCoreContext } from '../../../../shared/context';
import { SolanaStake } from './SolanaStake';
import type { ISolanaStake, SolanaStakeParams } from './types';

/**
 * Create Solana stake from context
 */
export function createSolanaStake(
  ctx: SolanaCoreContext,
  params: SolanaStakeParams,
): ISolanaStake {
  return new SolanaStake(ctx, params);
}

/**
 * Create Solana stake from config
 *
 * This is a placeholder - requires createSolanaCoreContext to be implemented.
 */
export function solanaStake(
  _config: LombardConfig,
  _params: SolanaStakeParams,
): ISolanaStake {
  throw new Error(
    'solanaStake() from config is not yet supported. Use sdk.chain.solana.stake() instead.',
  );
}
