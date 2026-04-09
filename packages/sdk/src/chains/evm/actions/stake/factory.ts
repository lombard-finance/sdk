/**
 * EVM Stake Factory Functions
 *
 * Provides factory functions for creating EvmStake instances.
 *
 * @module chains/evm/actions/stake/factory
 */

import type { LombardConfig } from "../../../../config/types";
import type { EvmCoreContext } from "../../../../shared/context";
import { createEvmCoreContext } from "../../../../shared/context";
import { EvmStake } from "./EvmStake";
import type { EvmStakeParams } from "./types";

/**
 * Create EvmStake action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const stake = sdk.chain.evm.stake({
 *   sourceChain: Chain.ETHEREUM,
 *   destChain: Chain.ETHEREUM,
 * });
 * await stake.prepare({ amount: '0.1' });
 * ```
 */
export function evmStake(
  config: LombardConfig,
  params: EvmStakeParams,
): EvmStake {
  const ctx = createEvmCoreContext(config);
  return new EvmStake(ctx, params);
}

/**
 * Create EvmStake action from context
 *
 * Use this when you already have an EvmCoreContext (e.g., in EvmActions).
 *
 * @param ctx - EvmCoreContext
 * @param params - Stake parameters
 * @returns EvmStake instance
 */
export function createEvmStake(
  ctx: EvmCoreContext,
  params: EvmStakeParams,
): EvmStake {
  return new EvmStake(ctx, params);
}
