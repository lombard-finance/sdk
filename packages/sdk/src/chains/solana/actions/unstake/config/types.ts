/**
 * Solana Unstake Chain Configuration Types
 *
 * @module chains/solana/actions/unstake/config/types
 */

import type { Env } from "@lombard.finance/sdk-common";
import type { z } from "zod";

import type { Chain, ChainType } from "../../../../../core";

/**
 * Route definition for Solana unstake operations
 */
export interface RouteDefinition {
  /** Source chain (Solana network) */
  sourceChains: Chain[];
  /** Destination chain (where BTC/BTC.b is received) */
  destChain: Chain;
  /** Supported environments */
  envs: Env[];
}

/**
 * Chain-specific configuration for Solana unstake operations
 */
export interface ChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: RouteDefinition[];

  /** Recipient address validation Zod schema */
  recipientSchema: z.ZodType<string>;
}
