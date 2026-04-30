/**
 * EVM Withdraw Chain Configuration Types
 *
 * @module chains/evm/actions/withdraw/config/types
 */

import { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type {
  Chain,
  ChainType,
  DeployProtocol } from '../../../../../core';

/**
 * Route definition for EVM withdraw operations
 */
export interface WithdrawRouteDefinition {
  /** Supported source chains */
  sourceChains: Chain[];
  /** Supported DeFi protocols */
  protocols: DeployProtocol[];
  /** Supported environments */
  envs: Env[];
}

/**
 * Chain-specific configuration for EVM withdraw operations
 */
export interface WithdrawChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: WithdrawRouteDefinition[];

  /** Address validation Zod schema */
  addressSchema: z.ZodString;
}
