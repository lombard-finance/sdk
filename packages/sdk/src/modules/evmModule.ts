/**
 * EVM Module
 *
 * Provides EVM chain service for contract interactions and fee authorization.
 * Uses Service-First pattern: module is a thin factory that instantiates the service.
 *
 * @module modules/evmModule
 */

import type {
  ChainModule,
  EvmService as IEvmService,
} from '@lombard.finance/sdk-common';

import { EvmService } from '../services/EvmService';

/**
 * Create EVM module
 *
 * Built-in module that provides EvmService. Automatically included by createLombardSDK().
 *
 * @example
 * ```ts
 * const sdk = await createLombardSDK({
 *   env: Env.prod,
 *   providers: { evm: () => window.ethereum },
 * });
 * const unstake = sdk.chain.evm.unstake({ ... });
 * ```
 */
export function evmModule(): ChainModule<'evm', IEvmService> {
  return {
    id: 'evm',
    chain: 'evm',
    register(ctx) {
      // Forward configured RPC overrides so read methods (e.g. getMintingFee)
      // hit the configured endpoints instead of public defaults.
      return new EvmService(ctx.env, ctx.rpcUrls);
    },
  };
}

// Re-export service class and interface type
export { EvmService };
export type { IEvmService as EvmServiceInterface };
export type {
  EvmChainId,
  FeeAuthorizationResult,
  StoredFeeSignature,
} from '@lombard.finance/sdk-common';
