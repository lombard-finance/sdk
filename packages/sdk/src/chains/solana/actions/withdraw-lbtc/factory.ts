/**
 * Solana Withdraw Factory Functions
 *
 * @module chains/solana/actions/withdraw-lbtc/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { SolanaCoreContext } from '../../../../shared/context';
import { SolanaWithdrawLbtc } from './SolanaWithdrawLbtc';
import type { ISolanaWithdrawLbtc, SolanaWithdrawLbtcParams } from './types';

/**
 * Create Solana withdraw from context
 */
export function createSolanaWithdrawLbtc(
  ctx: SolanaCoreContext,
  params: SolanaWithdrawLbtcParams,
): ISolanaWithdrawLbtc {
  return new SolanaWithdrawLbtc(ctx, params);
}

/**
 * Create Solana withdraw from config
 *
 * This is a placeholder - requires createSolanaCoreContext to be implemented.
 */
export function solanaWithdrawLbtc(
  _config: LombardConfig,
  _params: SolanaWithdrawLbtcParams,
): ISolanaWithdrawLbtc {
  throw new Error(
    'solanaWithdrawLbtc() from config is not yet supported. Use sdk.chain.solana.withdraw() instead.',
  );
}
