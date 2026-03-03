/**
 * Solana Redeem Factory Functions
 *
 * @module chains/solana/actions/redeem/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { SolanaCoreContext } from '../../../../shared/context';
import { SolanaRedeem } from './SolanaRedeem';
import type { ISolanaRedeem, SolanaRedeemParams } from './types';

/**
 * Create Solana redeem from context
 */
export function createSolanaRedeem(
  ctx: SolanaCoreContext,
  params: SolanaRedeemParams,
): ISolanaRedeem {
  return new SolanaRedeem(ctx, params);
}

/**
 * Create Solana redeem from config
 *
 * This is a placeholder - requires createSolanaCoreContext to be implemented.
 */
export function solanaRedeem(
  _config: LombardConfig,
  _params: SolanaRedeemParams,
): ISolanaRedeem {
  throw new Error(
    'solanaRedeem() from config is not yet supported. Use sdk.chain.solana.redeem() instead.',
  );
}
