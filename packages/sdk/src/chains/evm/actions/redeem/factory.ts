/**
 * EVM Redeem Factory Functions
 *
 * @module chains/evm/actions/redeem/factory
 */

import type { LombardConfig } from "../../../../config/types";
import type { EvmCoreContext } from "../../../../shared/context";
import { createEvmCoreContext } from "../../../../shared/context";
import { EvmRedeem } from "./EvmRedeem";
import type { EvmRedeemParams } from "./types";

/**
 * Create EvmRedeem action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const redeem = sdk.chain.evm.redeem({
 *   sourceChain: Chain.ETHEREUM,
 * });
 * await redeem.prepare({ amount: '0.1' });
 * ```
 */
export function evmRedeem(
  config: LombardConfig,
  params: EvmRedeemParams,
): EvmRedeem {
  const ctx = createEvmCoreContext(config);
  return new EvmRedeem(ctx, params);
}

/**
 * Create EvmRedeem action from context
 */
export function createEvmRedeem(
  ctx: EvmCoreContext,
  params: EvmRedeemParams,
): EvmRedeem {
  return new EvmRedeem(ctx, params);
}
