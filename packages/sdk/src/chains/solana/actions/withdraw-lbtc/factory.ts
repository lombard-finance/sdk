/**
 * Solana Unstake Factory Functions
 *
 * @module chains/solana/actions/withdraw-lbtc/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { SolanaCoreContext } from '../../../../shared/context';
import { SolanaWithdrawLbtc } from './SolanaWithdrawLbtc';
import type { ISolanaWithdrawLbtc, SolanaWithdrawLbtcParams } from './types';

/**
 * Create Solana unstake from context
 */
export function createSolanaUnstake(
  ctx: SolanaCoreContext,
  params: SolanaWithdrawLbtcParams,
): ISolanaWithdrawLbtc {
  return new SolanaWithdrawLbtc(ctx, params);
}

/**
 * Create Solana unstake from config
 *
 * This is a placeholder - requires createSolanaCoreContext to be implemented.
 */
export function solanaUnstake(
  _config: LombardConfig,
  _params: SolanaWithdrawLbtcParams,
): ISolanaWithdrawLbtc {
  throw new Error(
    'solanaUnstake() from config is not yet supported. Use sdk.chain.solana.unstake() instead.',
  );
}
