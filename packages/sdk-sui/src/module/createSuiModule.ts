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
import type { ISuiNetworkGrpcOptions } from '../utils/createSuiGrpcClient';

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
 * @example Pinning your own endpoints
 * ```ts
 * suiModule({ grpcUrls: { mainnet: ['https://your-node.example'] } });
 * ```
 *
 * The override is keyed by network because the service resolves the network
 * per call from the chain id, so one instance can serve mainnet and testnet.
 *
 * @param options - Optional gRPC-Web endpoints to use instead of the defaults
 */
export function suiModule(
  options: ISuiNetworkGrpcOptions = {},
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
