/**
 * Solana Withdraw Chain Configuration Types
 *
 * @module chains/solana/actions/withdraw-lbtc/config/types
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { AssetId, Chain, ChainType } from '../../../../../core';

/**
 * Route definition for Solana withdraw operations
 */
export interface RouteDefinition {
  /** Source chain (Solana network) */
  sourceChains: Chain[];
  /** Destination chain */
  destChain: Chain;
  /** Asset being withdrawn (always LBTC) */
  assetIn: AssetId;
  /** Asset received (BTC or BTC.b) */
  assetOut: AssetId;
  /** Supported environments */
  envs: Env[];
}

/**
 * Chain-specific configuration for Solana withdraw operations
 */
export interface ChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: RouteDefinition[];

  /** Recipient address validation Zod schema */
  recipientSchema: z.ZodType<string>;
}
