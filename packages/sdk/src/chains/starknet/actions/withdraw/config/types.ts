/**
 * Starknet Withdraw Chain Configuration Types
 *
 * @module chains/starknet/actions/withdraw/config/types
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { Chain, ChainType } from '../../../../../core';

/**
 * Route definition for Starknet withdraw operations
 */
export interface RouteDefinition {
  sourceChains: Chain[];
  destChain: Chain;
  envs: Env[];
}

/**
 * Chain-specific configuration for Starknet withdraw operations
 */
export interface ChainConfig {
  chainType: ChainType;
  routes: RouteDefinition[];
  recipientSchema: z.ZodType<string>;
}
