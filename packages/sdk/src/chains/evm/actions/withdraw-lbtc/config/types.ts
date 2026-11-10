/**
 * EVM Withdraw Chain Configuration Types
 *
 * @module chains/evm/actions/withdraw-lbtc/config/types
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { Chain, ChainType } from '../../../../../core';

/**
 * Route definition for EVM withdraw operations
 */
export interface RouteDefinition {
  /** Supported source chains (where LBTC is burned) */
  sourceChains: Chain[];
  /** Destination chain (where BTC/BTC.b is received) */
  destChain: Chain;
  /** Supported environments */
  envs: Env[];
}

/**
 * Chain-specific configuration for EVM withdraw operations
 *
 * EVM withdraw burns LBTC and releases BTC (cross-chain) or BTC.b (same-chain).
 */
export interface ChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: RouteDefinition[];

  /** Recipient address validation Zod schema */
  recipientSchema: z.ZodType<string>;
}
