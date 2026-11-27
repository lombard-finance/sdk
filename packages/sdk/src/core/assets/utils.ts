/**
 * Asset Query Functions
 *
 * Simple utility functions for querying the asset catalog.
 *
 * @module core/assets/utils
 */

import type { Env } from '@lombard.finance/sdk-common';

import { type Chain, isEvmChain } from '../chains';
import { ASSET_CATALOG } from './catalog';
import type { AssetCatalog, AssetId, Deployment } from './types';

const DEFAULT_DECIMALS = 8;

/** Find a deployment matching asset, env, and chain */
function findDeployment(
  catalog: AssetCatalog,
  asset: AssetId,
  env: Env,
  chain: Chain,
): Deployment | undefined {
  const entry = catalog.assets[asset];
  if (!entry) return undefined;
  return entry.deployments.find(
    (d) => d.env === env && (d.chain === chain || d.chains?.includes(chain)),
  );
}

/** Get token address for a specific asset on a chain */
export function getAssetAddress(
  asset: AssetId,
  env: Env,
  chain: Chain,
  catalog: AssetCatalog = ASSET_CATALOG,
): string | undefined {
  return findDeployment(catalog, asset, env, chain)?.address;
}

/** Get token decimals for an asset */
export function getAssetDecimals(
  asset: AssetId,
  catalog: AssetCatalog = ASSET_CATALOG,
): number {
  return catalog.assets[asset]?.decimals ?? DEFAULT_DECIMALS;
}

/** Get asset router contract address */
export function getAssetRouter(
  asset: AssetId,
  env: Env,
  chain: Chain,
  catalog: AssetCatalog = ASSET_CATALOG,
): string | undefined {
  return findDeployment(catalog, asset, env, chain)?.assetRouter;
}

/** Check if an asset uses an asset router contract */
export function usesAssetRouter(
  asset: AssetId,
  env: Env,
  chain: Chain,
  catalog: AssetCatalog = ASSET_CATALOG,
): boolean {
  return !!findDeployment(catalog, asset, env, chain)?.assetRouter;
}

/** Get bridge adapter address */
export function getBridgeAdapter(
  asset: AssetId,
  env: Env,
  chain: Chain,
  catalog: AssetCatalog = ASSET_CATALOG,
): string | undefined {
  return findDeployment(catalog, asset, env, chain)?.bridgeAdapter;
}

/** Get public market maker address */
export function getPublicMarketMaker(
  asset: AssetId,
  env: Env,
  chain: Chain,
  catalog: AssetCatalog = ASSET_CATALOG,
): string | undefined {
  return findDeployment(catalog, asset, env, chain)?.publicMarketMaker;
}

/** Check if an asset is deployed on a specific chain */
export function isAssetDeployed(
  asset: AssetId,
  env: Env,
  chain: Chain,
  catalog: AssetCatalog = ASSET_CATALOG,
): boolean {
  return !!findDeployment(catalog, asset, env, chain);
}

/** Find asset by contract address (reverse lookup) */
export function getAssetByAddress(
  address: string,
  env: Env,
  chain: Chain,
  catalog: AssetCatalog = ASSET_CATALOG,
): AssetId | undefined {
  const normalized = address.toLowerCase();

  for (const [assetId, entry] of Object.entries(catalog.assets)) {
    if (!entry) continue;
    const deployment = entry.deployments.find(
      (d) =>
        d.env === env &&
        (d.chain === chain || d.chains?.includes(chain)) &&
        d.address.toLowerCase() === normalized,
    );
    if (deployment) return assetId as AssetId;
  }
  return undefined;
}

/** Get all chains where an asset is deployed in a specific environment */
export function getAssetChains(
  asset: AssetId,
  env: Env,
  catalog: AssetCatalog = ASSET_CATALOG,
): Chain[] {
  const entry = catalog.assets[asset];
  if (!entry) return [];

  const chains: Chain[] = [];
  for (const d of entry.deployments) {
    if (d.env !== env) continue;
    if (d.chain) chains.push(d.chain);
    if (d.chains) chains.push(...d.chains);
  }
  return chains;
}

/** Get all environments where an asset is deployed on a specific chain */
export function getAssetEnvironments(
  asset: AssetId,
  chain: Chain,
  catalog: AssetCatalog = ASSET_CATALOG,
): Env[] {
  const entry = catalog.assets[asset];
  if (!entry) return [];

  const envs = new Set<Env>();
  for (const d of entry.deployments) {
    if (d.chain === chain || d.chains?.includes(chain)) {
      envs.add(d.env);
    }
  }
  return Array.from(envs);
}

/** Get all supported assets */
export function getSupportedAssets(
  catalog: AssetCatalog = ASSET_CATALOG,
): AssetId[] {
  return Object.keys(catalog.assets) as AssetId[];
}

/**
 * Get all chains where an asset is deployed across ALL environments
 *
 * Useful for action configs that need to know all possible destination chains.
 * Deduplicates chains that appear in multiple environments.
 */
export function getAllAssetChains(
  asset: AssetId,
  catalog: AssetCatalog = ASSET_CATALOG,
): Chain[] {
  const entry = catalog.assets[asset];
  if (!entry) return [];

  const chainSet = new Set<Chain>();
  for (const d of entry.deployments) {
    if (d.chain) chainSet.add(d.chain);
    if (d.chains) d.chains.forEach((c) => chainSet.add(c));
  }
  return Array.from(chainSet);
}

/**
 * Get chains for specific environments
 *
 * @param asset - Asset ID
 * @param envs - Array of environments to include
 * @returns Deduplicated array of chains
 */
export function getAssetChainsForEnvs(
  asset: AssetId,
  envs: Env[],
  catalog: AssetCatalog = ASSET_CATALOG,
): Chain[] {
  const entry = catalog.assets[asset];
  if (!entry) return [];

  const chainSet = new Set<Chain>();
  for (const d of entry.deployments) {
    if (!envs.includes(d.env)) continue;
    if (d.chain) chainSet.add(d.chain);
    if (d.chains) d.chains.forEach((c) => chainSet.add(c));
  }
  return Array.from(chainSet);
}

/** Get asset metadata (decimals, symbol, name) */
export function getAssetMetadata(
  asset: AssetId,
  catalog: AssetCatalog = ASSET_CATALOG,
): { decimals: number; symbol: string; name?: string } | undefined {
  const entry = catalog.assets[asset];
  if (!entry) return undefined;
  return { decimals: entry.decimals, symbol: entry.symbol, name: entry.name };
}

/**
 * Get EVM chains where an asset is deployed for specific environments
 *
 * Filters chains by type 'evm' from the catalog.
 *
 * @param asset - Asset ID
 * @param envs - Array of environments to include
 * @returns Array of EVM chains where asset is deployed
 */
export function getEvmAssetChains(
  asset: AssetId,
  envs: Env[],
  catalog: AssetCatalog = ASSET_CATALOG,
): Chain[] {
  return getAssetChainsForEnvs(asset, envs, catalog).filter((chain) =>
    isEvmChain(chain),
  );
}

/**
 * Get chains where multiple assets are ALL deployed (intersection)
 *
 * Useful for finding chains that support both LBTC and BTCb for same-chain unstake.
 *
 * @param assets - Array of Asset IDs that must all be present
 * @param envs - Array of environments to include
 * @returns Array of chains where ALL assets are deployed
 */
export function getChainsWithAllAssets(
  assets: AssetId[],
  envs: Env[],
  catalog: AssetCatalog = ASSET_CATALOG,
): Chain[] {
  if (assets.length === 0) return [];

  // Get chains for first asset
  const firstAssetChains = new Set(
    getAssetChainsForEnvs(assets[0], envs, catalog),
  );

  // Intersect with chains for remaining assets
  for (let i = 1; i < assets.length; i++) {
    const assetChains = new Set(
      getAssetChainsForEnvs(assets[i], envs, catalog),
    );
    for (const chain of firstAssetChains) {
      if (!assetChains.has(chain)) {
        firstAssetChains.delete(chain);
      }
    }
  }

  return Array.from(firstAssetChains);
}

/**
 * Get EVM chains where multiple assets are ALL deployed
 *
 * @param assets - Array of Asset IDs that must all be present
 * @param envs - Array of environments to include
 * @returns Array of EVM chains where ALL assets are deployed
 */
export function getEvmChainsWithAllAssets(
  assets: AssetId[],
  envs: Env[],
  catalog: AssetCatalog = ASSET_CATALOG,
): Chain[] {
  return getChainsWithAllAssets(assets, envs, catalog).filter((chain) =>
    isEvmChain(chain),
  );
}
