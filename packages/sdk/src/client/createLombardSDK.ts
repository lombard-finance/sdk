/**
 * Async factory for creating LombardSDK instances
 *
 * This is the primary entry point for the Lombard SDK.
 * It fetches the asset catalog asynchronously and initializes the SDK.
 */

import type { Env } from '@lombard.finance/sdk-common';

import type {
  CreateConfigOptions,
  LombardConfig,
  ResolvedLombardConfig,
} from '../config/types';
import { ASSET_CATALOG } from '../core/assets/catalog';
import type { AssetCatalog } from '../core/assets/types';
import { createConfig } from './createConfig';
import { LombardSDK } from './LombardSDK';

/**
 * Module-level catalog cache
 *
 * Caches the catalog promise per environment to avoid redundant fetches.
 * Multiple calls to createLombardSDK() with the same env will share
 * the same catalog fetch.
 *
 * @internal
 */
const catalogCache = new Map<Env, Promise<AssetCatalog>>();

/**
 * Fetch asset catalog with caching
 *
 * Currently returns bundled catalog immediately.
 * Future: Will fetch from remote S3/CDN with bundled fallback.
 *
 * The catalog is cached per environment - subsequent calls with the
 * same env return the same promise, avoiding duplicate fetches.
 *
 * @internal
 */
function fetchCatalogCached(env: Env): Promise<AssetCatalog> {
  if (!catalogCache.has(env)) {
    // TODO: Implement remote catalog fetching
    // When backend is ready:
    // 1. Fetch from CDN: https://cdn.lombard.finance/catalog/{env}.json
    // 2. Fallback to ASSET_CATALOG on network failure
    // 3. Cache-Control headers will define CDN TTL
    //
    // For now, return bundled catalog immediately (wrapped in Promise)
    catalogCache.set(env, Promise.resolve(ASSET_CATALOG));
  }
  return catalogCache.get(env)!;
}

/**
 * Create a LombardSDK instance
 *
 * This is an async factory that:
 * 1. Validates configuration (sync)
 * 2. Fetches the asset catalog (async, cached per env)
 * 3. Initializes the SDK with all chain actions
 *
 * The catalog is cached at the module level - multiple SDK instances
 * with the same environment share the same catalog fetch.
 *
 * @param options - SDK configuration options or pre-made LombardConfig
 * @returns Promise resolving to LombardSDK instance
 *
 * @example
 * ```typescript
 * // Option 1: Direct creation (recommended for simple cases)
 * const sdk = await createLombardSDK({
 *   env: Env.prod,
 *   providers: {
 *     evm: () => window.ethereum,
 *     bitcoin: () => bitcoinProvider,
 *   },
 * });
 *
 * // Option 2: Separate config (recommended for shared config)
 * // lib/lombard.ts
 * export const config = createConfig({
 *   env: Env.prod,
 *   providers: { evm: () => window.ethereum },
 * });
 *
 * // app.ts
 * import { config } from './lib/lombard';
 * const sdk = await createLombardSDK(config);
 *
 * // Use the SDK
 * const stake = sdk.chain.btc.stake({
 *   destChain: Chain.ETHEREUM,
 *   assetOut: AssetId.LBTC,
 * });
 * ```
 */
export async function createLombardSDK<E extends Env = Env>(
  options: (CreateConfigOptions & { env: E }) | LombardConfig,
): Promise<LombardSDK<E>> {
  // If already a LombardConfig (validated), use it
  // Otherwise, create config (sync validation)
  const config: LombardConfig =
    'modules' in options && Array.isArray(options.modules)
      ? (options as LombardConfig)
      : createConfig(options as CreateConfigOptions & { env: E });

  // Fetch catalog (async, cached per env)
  const catalog = await fetchCatalogCached(config.env);

  // Create resolved config with catalog
  const resolvedConfig: ResolvedLombardConfig = {
    ...config,
    catalog,
  };

  return new LombardSDK<E>(resolvedConfig);
}

/**
 * Clear the catalog cache
 *
 * Useful for testing or forcing a fresh catalog fetch.
 *
 * @internal
 */
export function clearCatalogCache(): void {
  catalogCache.clear();
}
