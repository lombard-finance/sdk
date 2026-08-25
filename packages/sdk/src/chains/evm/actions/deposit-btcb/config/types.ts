/**
 * EVM Stake Chain Configuration Types
 *
 * Defines the interface for source chain configurations.
 * Each supported chain implements this interface to provide
 * chain-specific behavior for EVM stake operations.
 *
 * @module chains/evm/actions/deposit-btcb/config/types
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { Chain, ChainType, DeployProtocol } from '../../../../../core';
import type { EvmCoreContext } from '../../../../../shared/context';

// ═══════════════════════════════════════════════════════════════════════════
// Route Definition
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Route definition for EVM stake operations
 *
 * Defines which source chains, protocols, and environments are supported.
 */
export interface RouteDefinition {
  /** Supported source chains */
  sourceChains: Chain[];
  /** Supported destination chains */
  destChains: Chain[];
  /** Supported DeFi protocols */
  protocols: DeployProtocol[];
  /** Supported environments */
  envs: Env[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Chain Configuration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Chain-specific configuration for EVM stake operations
 *
 * EVM stake deposits already-owned LBTC to DeFi vaults (Veda, Silo).
 */
export interface ChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: RouteDefinition[];

  /** Address validation Zod schema */
  addressSchema: z.ZodString;

  /**
   * Check if user has sufficient LBTC balance
   *
   * @param ctx - EVM core context
   * @param address - User address
   * @param amount - Amount to stake
   * @returns true if balance is sufficient
   */
  checkBalance?: (
    ctx: EvmCoreContext,
    address: string,
    amount: string,
  ) => Promise<boolean>;

  /**
   * Get required approval amount
   *
   * @param ctx - EVM core context
   * @param address - User address
   * @param spender - Vault/protocol address
   * @param amount - Amount to stake
   * @returns Approval amount needed (0 if already approved)
   */
  getApprovalNeeded?: (
    ctx: EvmCoreContext,
    address: string,
    spender: string,
    amount: string,
  ) => Promise<string>;
}
