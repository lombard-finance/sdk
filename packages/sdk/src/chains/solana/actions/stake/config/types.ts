/**
 * Solana Stake Chain Configuration Types
 *
 * @module chains/solana/actions/stake/config/types
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { AssetId, Chain, ChainType } from '../../../../../core';

export interface RouteDefinition {
  sourceChains: Chain[];
  destChain: Chain;
  assetIn: AssetId;
  assetOut: AssetId;
  envs: Env[];
}

export interface ChainConfig {
  chainType: ChainType;
  routes: RouteDefinition[];
  recipientSchema: z.ZodType<string>;
}
