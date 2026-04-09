/**
 * Sui Unstake Chain Configuration Types
 *
 * @module chains/sui/actions/unstake/config/types
 */

import type { Env } from "@lombard.finance/sdk-common";
import type { z } from "zod";

import type { Chain, ChainType } from "../../../../../core";

/**
 * Route definition for Sui unstake operations
 */
export interface RouteDefinition {
  sourceChains: Chain[];
  destChain: Chain;
  envs: Env[];
}

/**
 * Chain-specific configuration for Sui unstake operations
 */
export interface ChainConfig {
  chainType: ChainType;
  routes: RouteDefinition[];
  recipientSchema: z.ZodType<string>;
}
