/**
 * Starknet Unstake Chain Configuration Types
 *
 * @module chains/starknet/actions/unstake/config/types
 */

import type { z } from 'zod';

import type { Chain, ChainType, Env } from '../../../../../core';

/**
 * Route definition for Starknet unstake operations
 */
export interface RouteDefinition {
  sourceChains: Chain[];
  destChain: Chain;
  envs: Env[];
}

/**
 * Chain-specific configuration for Starknet unstake operations
 */
export interface ChainConfig {
  chainType: ChainType;
  routes: RouteDefinition[];
  recipientSchema: z.ZodType<string>;
}
