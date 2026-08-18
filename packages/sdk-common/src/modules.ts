import type { Env } from './env';
import type { ProviderFor, ProviderKey } from './providers';
import type { TRpcUrlConfig } from './rpc';

/**
 * Shared token for cross-module state
 */
export type SharedToken<T> = symbol & { __sharedToken?: T };

/**
 * Context provided to modules during registration
 */
export interface RegisterContext {
  env: Env;
  /**
   * Optional per-chain RPC URL overrides from the SDK config, keyed by chain ID.
   *
   * Modules/services should forward these to read clients so reads honor the
   * configured RPC endpoints instead of falling back to public defaults.
   */
  rpcUrls?: Partial<TRpcUrlConfig>;
  getProvider<TKey extends ProviderKey>(key: TKey): Promise<ProviderFor<TKey>>;
  getShared<T>(token: SharedToken<T>): T | undefined;
  setShared<T>(token: SharedToken<T>, value: T): void;
}

/**
 * SDK Module - Generic module interface
 *
 * Base interface for all SDK modules. Modules are thin factories that
 * instantiate services and register them with the SDK.
 *
 * Use this for non-chain-specific modules (e.g., apiModule).
 *
 * @template TId - Unique module identifier
 * @template TService - Service interface the module provides
 *
 * @example
 * ```typescript
 * function apiModule(): SdkModule<'api', ApiService> {
 *   return {
 *     id: 'api',
 *     register(ctx) {
 *       return new ApiService(ctx.env);
 *     },
 *   };
 * }
 * ```
 */
export interface SdkModule<TId extends string = string, TService = unknown> {
  /** Unique module identifier */
  id: TId;
  /** Provider keys required by this module */
  requiresProviders?: ProviderKey[];
  /** Factory function that creates the service */
  register(ctx: RegisterContext): TService;
}

/**
 * Chain Module - Module interface for blockchain-specific services
 *
 * Extension of SdkModule for chain-specific modules. Adds a `chain` field
 * to identify the blockchain type.
 *
 * Use this for chain-specific modules (e.g., btcModule, evmModule, solanaModule).
 *
 * @template TChain - Chain type identifier (e.g., 'btc', 'evm', 'solana')
 * @template TService - Service interface the module provides
 *
 * @example
 * ```typescript
 * function evmModule(): ChainModule<'evm', EvmService> {
 *   return {
 *     id: 'evm',
 *     chain: 'evm',
 *     register(ctx) {
 *       return new EvmService(ctx.env);
 *     },
 *   };
 * }
 * ```
 */
export interface ChainModule<
  TChain extends string = string,
  TService = unknown,
> extends SdkModule<TChain, TService> {
  /** Chain type this module provides services for */
  chain: TChain;
}

/**
 * Any module type (either SdkModule or ChainModule)
 */
export type AnyModule =
  | SdkModule<string, unknown>
  | ChainModule<string, unknown>;

/**
 * Extract module ID type from a module
 */
export type ModuleId<TModule> =
  TModule extends SdkModule<infer TId, unknown> ? TId : never;

/**
 * Extract service type from a module by ID
 */
export type ServiceOf<
  TModule extends SdkModule<string, unknown>,
  TId extends string,
> = TModule extends SdkModule<TId, infer TService> ? TService : never;

/**
 * @deprecated Use ServiceOf instead
 */
export type CapabilitiesOf<
  TModule extends ChainModule<string, unknown>,
  TId extends string,
> = TModule extends ChainModule<string, infer TCapabilities> & { id: TId }
  ? TCapabilities
  : never;
