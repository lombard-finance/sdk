/**
 * Core Module
 *
 * Foundational definitions for chains, assets, and common types.
 *
 * @module core
 */

// ═══════════════════════════════════════════════════════════════════════════
// Chain exports
// ═══════════════════════════════════════════════════════════════════════════

export type { ChainMetadata, ChainType, ChainTypeMetadata } from './chains';
export {
  CAIP2_SEPARATOR,
  Chain,
  CHAIN_CATALOG,
  CHAIN_PREFIXES,
  chainValueToKey,
  evmChainIdToChain,
  getChainMetadata,
  getChainName,
  getChainsByType,
  getChainType,
  getChainTypeMetadata,
  getExplorerAddressUrl,
  getExplorerTxUrl,
  getMainnetChains,
  getTestnetChains,
  isChain,
  isEvmChain,
  isMainnet,
  isTestnet,
  parseChainIdentifier } from './chains';

// ═══════════════════════════════════════════════════════════════════════════
// Asset exports
// ═══════════════════════════════════════════════════════════════════════════

export type { AssetCatalog, AssetEntry, Deployment } from './assets';
export {
  ASSET_CATALOG,
  AssetId,
  assetValueToKey,
  getAllAssetChains,
  getAssetAddress,
  getAssetByAddress,
  getAssetChains,
  getAssetChainsForEnvs,
  getAssetDecimals,
  getAssetDisplayName,
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
  isAssetId,
  usesAssetRouter } from './assets';

// ═══════════════════════════════════════════════════════════════════════════
// Common types
// ═══════════════════════════════════════════════════════════════════════════

export type { DeployConfig, RouteParams, StrategyProgress } from './types';
export { DeployProtocol, StepStatus, StrategyStatus } from './types';
