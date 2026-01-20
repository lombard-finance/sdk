/**
 * Sui Module
 *
 * Provides Sui chain service for LBTC operations.
 * Uses Service-First pattern: module is a thin factory that instantiates the service.
 *
 * @module module/createSuiModule
 */

import type { ChainModule, SuiService } from '@lombard.finance/sdk-common';

import { SuiServiceImpl } from '../services/SuiServiceImpl';

/**
 * Create Sui module
 *
 * Optional module that provides SuiService for Sui operations.
 *
 * @example
 * ```ts
 * import { suiModule } from '@lombard.finance/sdk-sui';
 *
 * const config = createConfig({
 *   modules: [suiModule()],
 *   providers: { sui: () => suiWallet },
 * });
 * ```
 */
export function suiModule(): ChainModule<'sui', SuiService> {
  return {
    id: 'sui',
    chain: 'sui',
    requiresProviders: ['sui'],
    register(ctx) {
      return new SuiServiceImpl(() => ctx.getProvider('sui'));
    },
  };
}
