/**
 * EVM Deploy Chain Configuration Types
 *
 * @module chains/evm/actions/deploy/config/types
 */

import type { Env } from "@lombard.finance/sdk-common";
import type { z } from "zod";

import type {
  AssetId,
  Chain,
  ChainType,
  DeployProtocol,
} from "../../../../../core";

/**
 * Route definition for EVM deploy operations
 */
export interface RouteDefinition {
  /** Asset to deploy */
  asset: AssetId;
  /** Supported source chains */
  sourceChains: Chain[];
  /** Supported DeFi protocols */
  protocols: DeployProtocol[];
  /** Supported environments */
  envs: Env[];
}

/**
 * Chain-specific configuration for EVM deploy operations
 */
export interface ChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: RouteDefinition[];

  /** Address validation Zod schema */
  addressSchema: z.ZodString;
}
