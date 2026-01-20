/**
 * EVM Redeem Chain Configuration Types
 *
 * @module chains/evm/actions/redeem/config/types
 */

import type { z } from 'zod';

import type { AssetId, Chain, ChainType, Env } from '../../../../../core';

/**
 * Route definition for EVM redeem operations
 */
export interface RouteDefinition {
  /** Input asset (L-ZEC, L-SOL, etc.) */
  assetIn: AssetId;
  /** Output asset (ZEC, SOL, etc.) */
  assetOut: AssetId;
  /** Supported source chains */
  sourceChains: Chain[];
  /** Destination chain */
  destChain: Chain;
  /** Supported environments */
  envs: Env[];
}

/**
 * Chain-specific configuration for EVM redeem operations
 */
export interface ChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: RouteDefinition[];

  /** Recipient address validation Zod schema */
  recipientSchema: z.ZodType<string>;
}
