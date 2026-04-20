/**
 * Configuration types for the Lombard SDK
 *
 * This module defines the types for SDK configuration, including
 * provider getters, partner configuration, and custom asset registration.
 */

import type { AnyModule, Env } from '@lombard.finance/sdk-common';

import type { AssetId, Chain } from '../core';
import type { Logger } from '../shared/context/types';
import type {
  BtcProvider,
  EvmProvider,
  SolanaProvider,
  StarknetProvider,
  SuiProvider,
} from './providers';

/**
 * Provider getter function
 *
 * A function that returns a provider instance for a specific chain.
 * This allows lazy loading of providers only when needed.
 *
 * @param chain - Optional chain identifier (for multi-chain providers like EVM)
 * @returns Provider instance or promise of provider instance
 */
export type ProviderGetter<TProvider> = (
  chain?: Chain,
) => TProvider | Promise<TProvider>;

export interface ProviderGetters {
  evm?: ProviderGetter<EvmProvider>;
  bitcoin?: ProviderGetter<BtcProvider>;
  solana?: ProviderGetter<SolanaProvider>;
  sui?: ProviderGetter<SuiProvider>;
  starknet?: ProviderGetter<StarknetProvider>;
}

/**
 * Get provider getter from config by key
 *
 * Uses explicit property access to avoid security concerns with dynamic keys.
 * This pattern is required by static analysis tools (Codacy/Semgrep) to prevent
 * potential object injection vulnerabilities.
 *
 * @param providers - Provider getters configuration
 * @param key - Provider key to retrieve
 * @returns Provider getter function or undefined if not configured
 */
export function getProviderGetter<T = unknown>(
  providers: ProviderGetters,
  key: string,
): ProviderGetter<T> | undefined {
  let getter: ProviderGetter<unknown> | undefined;
  switch (key) {
    case 'evm':
      getter = providers.evm;
      break;
    case 'bitcoin':
      getter = providers.bitcoin;
      break;
    case 'solana':
      getter = providers.solana;
      break;
    case 'sui':
      getter = providers.sui;
      break;
    case 'starknet':
      getter = providers.starknet;
      break;
    default:
      getter = undefined;
  }
  return getter as ProviderGetter<T> | undefined;
}

/**
 * SDK configuration options
 *
 * Options passed to createConfig(). `modules` is optional; built-ins are
 * registered automatically if not provided.
 *
 * @example
 * ```typescript
 * // Config is synchronous - can be exported directly
 * export const config = createConfig({
 *   env: Env.prod,
 *   providers: { evm: () => window.ethereum },
 *   debug: true,  // Enable console logging
 * });
 *
 * // SDK creation is async (fetches catalog)
 * const sdk = await createLombardSDK(config);
 * ```
 */
export interface CreateConfigOptions {
  /** Environment (prod, testnet, stage, dev) */
  env: Env;

  /** Wallet provider getters for each chain */
  providers?: ProviderGetters;

  /** Optional modules to register */
  modules?: readonly AnyModule[];

  /** Partner configuration */
  partner?: PartnerConfig;

  /**
   * Optional logger for SDK operations
   *
   * Provide your own logger to integrate with your logging infrastructure
   * (e.g., Sentry, DataDog, custom logging).
   *
   * @example
   * ```typescript
   * logger: {
   *   error: (msg, meta) => Sentry.captureMessage(msg, { extra: meta }),
   *   warn: console.warn,
   *   info: console.info,
   *   debug: () => {},  // Suppress debug logs
   * }
   * ```
   */
  logger?: Logger;

  /**
   * Enable debug mode
   *
   * When true, creates a console logger that outputs all SDK operations.
   * Useful for development and debugging.
   *
   * Note: If both `logger` and `debug` are provided, `logger` takes precedence.
   *
   * @default false
   */
  debug?: boolean;
}

/**
 * Validated SDK configuration
 *
 * Configuration object returned by createConfig(). This is a plain,
 * synchronous object that can be exported from a module and passed around.
 *
 * The asset catalog is NOT included here - it's fetched asynchronously
 * when createLombardSDK() is called.
 */
export interface LombardConfig {
  env: Env;
  providers: ProviderGetters;
  modules: readonly AnyModule[];
  partner?: PartnerConfig;
  logger?: Logger;
}

/**
 * Resolved SDK configuration (internal)
 *
 * Extended config with the asset catalog, used internally by LombardSDK.
 * Users don't interact with this type directly.
 *
 * @internal
 */
export interface ResolvedLombardConfig extends LombardConfig {
  /**
   * Asset catalog (fetched during SDK initialization)
   *
   * Contains all asset deployments, chain configs, and addresses.
   * This is fetched asynchronously during createLombardSDK() to allow
   * for dynamic updates without SDK releases.
   */
  catalog: import('../core/assets/types').AssetCatalog;
}

export type LombardSDKOptions = CreateConfigOptions;

/**
 * Partner configuration
 *
 * Configuration for partners integrating the SDK.
 */
export interface PartnerConfig {
  /** Unique partner identifier */
  partnerId: string;
}

/**
 * Custom asset registration
 *
 * Allows partners to register custom assets (e.g., SPL tokens).
 */
export interface CustomAsset {
  /** Asset type */
  type: 'spl' | 'erc20' | 'native';

  /** Contract address (for token assets) */
  address?: string;

  /** Asset symbol */
  symbol: string;

  /** Number of decimals */
  decimals: number;

  /** L-Asset symbol (how it will be named in Lombard) */
  lAssetSymbol: string;

  /** Chain where the asset exists */
  chain?: Chain;

  /** Optional: Asset ID mapping */
  assetId?: AssetId;
}
