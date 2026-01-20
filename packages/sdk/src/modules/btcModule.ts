/**
 * BTC Module
 *
 * Provides Bitcoin chain service for deposit monitoring and address operations.
 * Uses Service-First pattern: module is a thin factory that instantiates the service.
 *
 * @module modules/btcModule
 */

import type {
  BtcService as IBtcService,
  ChainModule,
} from '@lombard.finance/sdk-common';

import { BtcService } from '../services/BtcService';

/**
 * Create BTC module
 *
 * Built-in module that provides BtcService. Automatically included by createLombardSDK().
 *
 * @example
 * ```ts
 * const sdk = await createLombardSDK({
 *   env: Env.prod,
 *   providers: { evm: () => window.ethereum },
 * });
 * const stake = sdk.chain.btc.stake({ ... });
 * ```
 */
export function btcModule(): ChainModule<'btc', IBtcService> {
  return {
    id: 'btc',
    chain: 'btc',
    register() {
      return new BtcService();
    },
  };
}

// Re-export service class and interface type
export { BtcService };
export type { IBtcService as BtcServiceInterface };
