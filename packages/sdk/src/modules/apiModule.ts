/**
 * API Module
 *
 * Provides Lombard backend API service for internal use by actions.
 * Uses Service-First pattern: module is a thin factory that instantiates the service.
 *
 * Note: This is an internal service for dependency injection into actions.
 * For public APIs, use the SDK namespace methods (e.g., sdk.deposits.getByAddress())
 * which call the underlying functions directly and return rich types.
 *
 * @module modules/apiModule
 */

import type {
  ApiService as IApiService,
  SdkModule } from '@lombard.finance/sdk-common';

import { ApiService } from '../services/ApiService';

/**
 * Create API module
 *
 * Internal module that provides ApiService. Automatically included by createLombardSDK().
 *
 * @example
 * ```ts
 * const sdk = await createLombardSDK({
 *   env: Env.prod,
 *   providers: { evm: () => window.ethereum },
 * });
 * const deposits = await sdk.api.deposits('0x...');
 * ```
 */
export function apiModule(): SdkModule<'api', IApiService> {
  return {
    id: 'api',
    register(ctx) {
      return new ApiService(ctx.env);
    } };
}

// Re-export service class and interface type
export { ApiService };
export type { IApiService as ApiServiceInterface };
export type {
  DepositInfo,
  GenerateDepositAddressParams,
  GetDepositAddressParams } from '@lombard.finance/sdk-common';
