/**
 * Solana Unstake Factory Functions
 *
 * @module chains/solana/actions/unstake/factory
 */

import type { LombardConfig } from "../../../../config/types";
import type { SolanaCoreContext } from "../../../../shared/context";
import { SolanaUnstake } from "./SolanaUnstake";
import type { ISolanaUnstake, SolanaUnstakeParams } from "./types";

/**
 * Create Solana unstake from context
 */
export function createSolanaUnstake(
  ctx: SolanaCoreContext,
  params: SolanaUnstakeParams,
): ISolanaUnstake {
  return new SolanaUnstake(ctx, params);
}

/**
 * Create Solana unstake from config
 *
 * This is a placeholder - requires createSolanaCoreContext to be implemented.
 */
export function solanaUnstake(
  _config: LombardConfig,
  _params: SolanaUnstakeParams,
): ISolanaUnstake {
  throw new Error(
    "solanaUnstake() from config is not yet supported. Use sdk.chain.solana.unstake() instead.",
  );
}
