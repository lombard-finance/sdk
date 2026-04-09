/**
 * Starknet Unstake Factory Functions
 *
 * @module chains/starknet/actions/unstake/factory
 */

import type { LombardConfig } from "../../../../config/types";
import type { StarknetCoreContext } from "../../../../shared/context";
import { StarknetUnstake } from "./StarknetUnstake";
import type { IStarknetUnstake, StarknetUnstakeParams } from "./types";

/**
 * Create Starknet unstake from context
 */
export function createStarknetUnstake(
  ctx: StarknetCoreContext,
  params: StarknetUnstakeParams,
): IStarknetUnstake {
  return new StarknetUnstake(ctx, params);
}

/**
 * Create Starknet unstake from config
 */
export function starknetUnstake(
  _config: LombardConfig,
  _params: StarknetUnstakeParams,
): IStarknetUnstake {
  throw new Error(
    "starknetUnstake() from config is not yet supported. Use sdk.chain.starknet.unstake() instead.",
  );
}
