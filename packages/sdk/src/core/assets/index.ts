/**
 * Core Assets Module
 *
 * Asset identifiers, catalog, and query functions.
 *
 * @module core/assets
 */

// Types and constants
export type { AssetCatalog, AssetEntry, Deployment } from './types';
export {
  AssetId,
  assetValueToKey,
  getAssetDisplayName,
  isAssetId,
} from './types';

// Catalog
export { ASSET_CATALOG } from './catalog';

// Query functions
export {
  getAllAssetChains,
  getAssetAddress,
  getAssetByAddress,
  getAssetChains,
  getAssetChainsForEnvs,
  getAssetDecimals,
  getAssetEnvironments,
  getAssetMetadata,
  getAssetRouter,
  getBridgeAdapter,
  getChainsWithAllAssets,
  getEvmAssetChains,
  getEvmChainsWithAllAssets,
  getPublicMarketMaker,
  getSupportedAssets,
  isAssetDeployed,
  usesAssetRouter,
} from './utils';
