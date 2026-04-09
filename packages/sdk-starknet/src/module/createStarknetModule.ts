/**
 * Starknet Module
 *
 * Provides Starknet chain service for LBTC operations.
 * Uses Service-First pattern: module is a thin factory that instantiates the service.
 *
 * @module module/createStarknetModule
 */

import type { ChainModule, StarknetService } from "@lombard.finance/sdk-common";

import { StarknetServiceImpl } from "../services/StarknetServiceImpl";

/**
 * Create Starknet module
 *
 * Optional module that provides StarknetService for Starknet operations.
 *
 * @example
 * ```ts
 * import { starknetModule } from '@lombard.finance/sdk-starknet';
 *
 * const config = createConfig({
 *   modules: [starknetModule()],
 *   providers: { starknet: () => starknetWallet },
 * });
 * ```
 */
export function starknetModule(): ChainModule<"starknet", StarknetService> {
  return {
    id: "starknet",
    chain: "starknet",
    requiresProviders: ["starknet"],
    register(ctx) {
      return new StarknetServiceImpl(() => ctx.getProvider("starknet"));
    },
  };
}
