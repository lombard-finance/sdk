/**
 * Solana Redeem Chain Configuration Types
 *
 * @module chains/solana/actions/redeem/config/types
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { AssetId, Chain, ChainType } from '../../../../../core';

/**
 * Route definition for Solana redeem operations (LBTC → BTC.b)
 */
export interface RouteDefinition {
  /** Source chain (Solana network) */
  sourceChains: Chain[];
  /** Destination chain (same as source for same-chain redeem) */
  destChain: Chain;
  /** Asset being redeemed */
  assetIn: AssetId;
  /** Asset received */
  assetOut: AssetId;
  /** Supported environments */
  envs: Env[];
}

/**
 * Chain-specific configuration for Solana redeem operations
 */
export interface ChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: RouteDefinition[];

  /** Recipient address validation Zod schema */
  recipientSchema: z.ZodType<string>;
}
