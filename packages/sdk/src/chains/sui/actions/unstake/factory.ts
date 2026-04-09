/**
 * Sui Unstake Factory Functions
 *
 * @module chains/sui/actions/unstake/factory
 */

import type { LombardConfig } from "../../../../config/types";
import type { SuiCoreContext } from "../../../../shared/context";
import { SuiUnstake } from "./SuiUnstake";
import type { ISuiUnstake, SuiUnstakeParams } from "./types";

/**
 * Create Sui unstake from context
 */
export function createSuiUnstake(
  ctx: SuiCoreContext,
  params: SuiUnstakeParams,
): ISuiUnstake {
  return new SuiUnstake(ctx, params);
}

/**
 * Create Sui unstake from config
 */
export function suiUnstake(
  _config: LombardConfig,
  _params: SuiUnstakeParams,
): ISuiUnstake {
  throw new Error(
    "suiUnstake() from config is not yet supported. Use sdk.chain.sui.unstake() instead.",
  );
}
