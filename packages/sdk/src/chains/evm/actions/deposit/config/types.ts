/**
 * EVM Deposit Chain Configuration Types
 *
 * @module chains/evm/actions/deposit/config/types
 */

import type { z } from 'zod';

import type { AssetId, Chain, ChainType, Env } from '../../../../../core';

/**
 * Route definition for EVM deposit operations
 */
export interface RouteDefinition {
  /** Supported input assets (e.g., WBTC, BTCb) */
  assetsIn: AssetId[];
  /** Output asset (e.g., LBTC) */
  assetOut: AssetId;
  /** Supported source chains */
  sourceChains: Chain[];
  /** Supported destination chains */
  destChains: Chain[];
  /** Supported environments */
  envs: Env[];
}

/**
 * Chain-specific configuration for EVM deposit operations
 */
export interface ChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: RouteDefinition[];

  /** Address validation Zod schema */
  addressSchema: z.ZodString;
}
