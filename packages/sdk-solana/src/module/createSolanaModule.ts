/**
 * Solana Module
 *
 * Provides Solana chain service for LBTC operations.
 * Uses Service-First pattern: module is a thin factory that instantiates the service.
 *
 * @module module/createSolanaModule
 */

import type { ChainModule, SolanaService } from "@lombard.finance/sdk-common";

import { SolanaServiceImpl } from "../services/SolanaServiceImpl";

/**
 * Create Solana module
 *
 * Optional module that provides SolanaService for Solana operations.
 *
 * @example
 * ```ts
 * import { solanaModule } from '@lombard.finance/sdk-solana';
 *
 * const config = createConfig({
 *   modules: [solanaModule()],
 *   providers: { solana: () => window.solana },
 * });
 * ```
 */
export function solanaModule(): ChainModule<"solana", SolanaService> {
  return {
    id: "solana",
    chain: "solana",
    requiresProviders: ["solana"],
    register(ctx) {
      return new SolanaServiceImpl(() => ctx.getProvider("solana"));
    },
  };
}
