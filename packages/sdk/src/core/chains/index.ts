/**
 * Core Chains Module
 *
 * Chain identifiers, catalog, and query functions.
 *
 * @module core/chains
 */

// Types and constants
export type { ChainMetadata, ChainType } from './types';
export {
  CAIP2_SEPARATOR,
  Chain,
  CHAIN_PREFIXES,
  chainValueToKey,
  isChain } from './types';

// Catalog
export { CHAIN_CATALOG } from './catalog';

// Query functions
export type { ChainTypeMetadata } from './utils';
export {
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
  isEvmChain,
  isMainnet,
  isTestnet,
  parseChainIdentifier } from './utils';
