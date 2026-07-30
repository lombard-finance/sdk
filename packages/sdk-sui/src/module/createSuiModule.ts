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
import type { ISuiRpcOptions } from '../utils/createSuiClient';

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
 *
 * @param options - Optional JSON-RPC endpoints to use instead of the defaults
 */
export function suiModule(
  options: ISuiRpcOptions = {},
): ChainModule<'sui', SuiService> {
  return {
    id: 'sui',
    chain: 'sui',
    requiresProviders: ['sui'],
    register(ctx) {
      return new SuiServiceImpl(() => ctx.getProvider('sui'), options);
    },
  };
}
