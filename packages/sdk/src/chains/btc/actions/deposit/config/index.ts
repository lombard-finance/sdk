/**
 * BTC Deposit Chain Configuration Registry
 *
 * BTC Deposit: BTC → BTC.b (wrapped BTC without yield)
 *
 * @module chains/btc/actions/deposit/config
 */

import type { Env } from '@lombard.finance/sdk-common';

import type { AssetId, Chain, ChainType } from '../../../../../core';
import { evmDepositConfig } from './evm';
import { solanaDepositConfig } from './solana';
import type { DepositChainConfig } from './types';

export type {
  DepositChainConfig,
  DepositFeeAuthConfig,
  DepositRouteDefinition,
  FeeAuthResult,
  SignatureResult,
  StoredFeeSignature,
} from './types';

export { evmDepositConfig } from './evm';
export { solanaDepositConfig } from './solana';

// ═══════════════════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registry of all deposit chain configurations.
 *
 * Add new chain types here to support additional destination chains.
 */
export const depositConfigs: Partial<Record<ChainType, DepositChainConfig>> = {
  evm: evmDepositConfig,
  solana: solanaDepositConfig,
};

// ═══════════════════════════════════════════════════════════════════════════
// Lookup Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get deposit chain configuration by chain type
 */
export function getDepositChainConfig(
  chainType: ChainType,
): DepositChainConfig | undefined {
  return depositConfigs[chainType];
}

/**
 * Check if a destination chain is supported by a config
 */
export function isDestChainSupported(
  config: DepositChainConfig,
  destChain: Chain,
): boolean {
  return config.destChains.includes(destChain);
}

/**
 * Check if assetOut is supported for BTC Deposit
 */
export function isAssetOutSupported(
  config: DepositChainConfig,
  assetOut: AssetId,
): boolean {
  return config.supportedAssetsOut.includes(assetOut);
}

/**
 * Check if route is available for given source chain and environment
 */
export function isRouteAvailable(
  config: DepositChainConfig,
  sourceChain: Chain | undefined,
  env: Env,
): boolean {
  if (!sourceChain) return true;
  return config.routes.some(
    route =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}
