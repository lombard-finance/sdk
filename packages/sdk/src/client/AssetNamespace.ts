/**
 * Asset Namespace
 *
 * Provides type-safe access to the asset catalog bound to an environment.
 * All asset-related operations are namespaced under `sdk.assets.*`
 *
 * @example
 * ```ts
 * const sdk = createLombardSDK({ env: Env.prod });
 *
 * const address = sdk.assets.getAddress(AssetId.LBTC, Chain.ETHEREUM);
 * const decimals = sdk.assets.getDecimals(AssetId.LBTC);
 * const chains = sdk.assets.getChains(AssetId.LBTC);
 * ```
 */

import { DEFAULT_ENV, Env } from "@lombard.finance/sdk-common";

import {
  ASSET_CATALOG,
  type AssetCatalog,
  type AssetId,
  type Chain,
  getAssetAddress,
  getAssetByAddress,
  getAssetChains,
  getAssetDecimals,
  getAssetEnvironments,
  getAssetMetadata,
  getAssetRouter,
  getBridgeAdapter,
  getPublicMarketMaker,
  getSupportedAssets,
  isAssetDeployed,
  usesAssetRouter,
} from "../core";

export class AssetNamespace {
  private readonly catalog: AssetCatalog;

  constructor(
    private readonly env: Env = DEFAULT_ENV,
    catalog?: AssetCatalog,
  ) {
    this.catalog = catalog ?? ASSET_CATALOG;
  }

  /** Get token contract address */
  getAddress(asset: AssetId, chain: Chain): string | undefined {
    return getAssetAddress(asset, this.env, chain, this.catalog);
  }

  /** Get token decimals */
  getDecimals(asset: AssetId): number {
    return getAssetDecimals(asset, this.catalog);
  }

  /** Get asset metadata (decimals, symbol, name) */
  getMetadata(asset: AssetId) {
    return getAssetMetadata(asset, this.catalog);
  }

  /** Check if asset uses an asset router contract */
  usesAssetRouter(asset: AssetId, chain: Chain): boolean {
    return usesAssetRouter(asset, this.env, chain, this.catalog);
  }

  /** Get asset router contract address */
  getAssetRouter(asset: AssetId, chain: Chain): string | undefined {
    return getAssetRouter(asset, this.env, chain, this.catalog);
  }

  /** Get bridge adapter address */
  getBridgeAdapter(asset: AssetId, chain: Chain): string | undefined {
    return getBridgeAdapter(asset, this.env, chain, this.catalog);
  }

  /** Get public market maker address */
  getPublicMarketMaker(asset: AssetId, chain: Chain): string | undefined {
    return getPublicMarketMaker(asset, this.env, chain, this.catalog);
  }

  /** Find asset by contract address (reverse lookup) */
  getByAddress(address: string, chain: Chain): AssetId | undefined {
    return getAssetByAddress(address, this.env, chain, this.catalog);
  }

  /** Check if asset is deployed on a chain */
  isDeployed(asset: AssetId, chain: Chain): boolean {
    return isAssetDeployed(asset, this.env, chain, this.catalog);
  }

  /** Get all chains where asset is deployed */
  getChains(asset: AssetId): Chain[] {
    return getAssetChains(asset, this.env, this.catalog);
  }

  /** Get all environments where asset is deployed on a chain */
  getEnvironments(asset: AssetId, chain: Chain): Env[] {
    return getAssetEnvironments(asset, chain, this.catalog);
  }

  /** Get all supported assets */
  getSupportedAssets(): AssetId[] {
    return getSupportedAssets(this.catalog);
  }

  /** Direct access to the asset catalog */
  getCatalog(): AssetCatalog {
    return this.catalog;
  }
}
