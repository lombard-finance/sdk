/**
 * Chain Configuration Registry
 *
 * Exports all chain configurations and provides registry lookup functions.
 *
 * BTC Stake: BTC → LBTC (yield-bearing staked BTC)
 *
 * @module chains/btc/actions/stake/config
 */

import type { Env } from '@lombard.finance/sdk-common';

import type { AssetId, Chain, ChainType } from '../../../../../core';
import { evmConfig } from './evm';
import { solanaConfig } from './solana';
import { starknetConfig } from './starknet';
import { suiConfig } from './sui';
import type { ChainConfig } from './types';

// Re-export types
export type {
  ChainConfig,
  FeeAuthConfig,
  FeeAuthResult,
  RouteDefinition,
  SignatureResult,
  StoredFeeSignature,
} from './types';

// Re-export individual configs
export { evmConfig } from './evm';
export { solanaConfig } from './solana';
export { starknetConfig } from './starknet';
export { suiConfig } from './sui';

// ═══════════════════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registry of all chain configurations
 *
 * Add new chain types here to support additional destination chains.
 * The key must match the ChainType from the chain catalog.
 */
export const chainConfigs: Partial<Record<ChainType, ChainConfig>> = {
  evm: evmConfig,
  solana: solanaConfig,
  sui: suiConfig,
  starknet: starknetConfig,
};

// ═══════════════════════════════════════════════════════════════════════════
// Lookup Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get chain configuration by chain type
 *
 * @param chainType - The chain type from getChainType()
 * @returns ChainConfig or undefined if not supported
 */
export function getChainConfig(chainType: ChainType): ChainConfig | undefined {
  return chainConfigs[chainType];
}

/**
 * Check if a chain type is supported for BTC staking
 *
 * @param chainType - The chain type to check
 * @returns true if supported
 */
export function isChainTypeSupported(chainType: ChainType): boolean {
  return chainType in chainConfigs;
}

/**
 * Check if a specific route is available
 *
 * @param config - Chain configuration
 * @param sourceChain - Source chain (Bitcoin network)
 * @param env - Environment
 * @returns true if route is available
 */
export function isRouteAvailable(
  config: ChainConfig,
  sourceChain: Chain | undefined,
  env: Env,
): boolean {
  if (!sourceChain) return true; // No source chain specified, allow all

  return config.routes.some(
    (route) =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}

/**
 * Check if a destination chain is supported by a config
 *
 * @param config - Chain configuration
 * @param destChain - Destination chain
 * @returns true if destination chain is supported
 */
export function isDestChainSupported(
  config: ChainConfig,
  destChain: Chain,
): boolean {
  return config.destChains.includes(destChain);
}

/**
 * Check if an output asset is supported by a config
 *
 * @param config - Chain configuration
 * @param assetOut - Output asset
 * @returns true if output asset is supported
 */
export function isAssetOutSupported(
  config: ChainConfig,
  assetOut: AssetId,
): boolean {
  return config.supportedAssetsOut.includes(assetOut);
}
