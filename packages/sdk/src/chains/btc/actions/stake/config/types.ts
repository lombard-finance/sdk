/**
 * Chain Configuration Types
 *
 * Defines the interface for destination chain configurations.
 * Each supported chain implements this interface to provide
 * chain-specific behavior for BTC stake operations.
 *
 * BTC Stake: BTC → LBTC (yield-bearing staked BTC)
 *
 * @module chains/btc/actions/stake/config/types
 */

import type { z } from 'zod';

import type { AssetId, Chain, ChainType, Env } from '../../../../../core';
import type { BtcCoreContext } from '../../../../../shared/context';

// ═══════════════════════════════════════════════════════════════════════════
// Signature Result
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Result from chain signature acquisition
 */
export interface SignatureResult {
  /** The signature to use for deposit address generation */
  signature: string;
  /** EIP-712 typed data (for EVM fee authorization) */
  typedData?: string;
  /** Public key (required for Starknet) */
  pubKey?: string;
  /** Padded address if chain requires it (Starknet) */
  paddedAddress?: string;
}

/**
 * Stored fee signature result from restore operation
 * 
 * Note: The API may return hasSignature: true but not the actual signature string.
 * The caller should check hasSignature to determine if a valid signature exists on the server.
 */
export interface StoredFeeSignature {
  hasSignature: boolean;
  signature?: string;
  typedData?: string;
  expirationDate?: string;
}

/**
 * Fee authorization result
 */
export interface FeeAuthResult {
  signature: string;
  typedData?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Route Definition
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Route definition for a chain configuration
 */
export interface RouteDefinition {
  /** Supported source chains (Bitcoin networks) */
  sourceChains: Chain[];
  /** Supported environments */
  envs: Env[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Fee Authorization Config
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fee authorization configuration
 *
 * When present, ALL methods are guaranteed to exist.
 * Used for chains that require fee authorization (e.g., Ethereum mainnet).
 */
export interface FeeAuthConfig {
  /**
   * Get minting fee for display
   * Called in prepare() to fetch fee before authorization
   */
  getMintingFee: (ctx: BtcCoreContext, chainId: unknown) => Promise<string>;

  /**
   * Try to restore a stored fee signature (resume flow)
   * Called in prepare() before getMintingFee
   */
  restoreFeeSignature: (
    ctx: BtcCoreContext,
    chainId: unknown,
    address: string,
  ) => Promise<StoredFeeSignature | null>;

  /**
   * Authorize fee (EIP-712 signing)
   * Called in authorize() when fee auth is required
   */
  authorizeFee: (
    ctx: BtcCoreContext,
    params: { chainId: unknown; recipient: string; fee: string },
  ) => Promise<FeeAuthResult>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Chain Configuration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Chain-specific configuration for BTC stake operations
 *
 * Each supported destination chain type has a config that defines:
 * - Supported routes (source chains × environments)
 * - Supported destination chains
 * - Supported output assets (BTC Stake produces LBTC)
 * - How to validate addresses (via Zod schema)
 * - Fee authorization config (if required for this chain)
 * - How to acquire the destination signature
 */
export interface ChainConfig {
  /** Chain type identifier */
  chainType: ChainType;

  /** Supported routes for this chain type */
  routes: RouteDefinition[];

  /** Supported destination chains */
  destChains: Chain[];

  /** Supported output assets - BTC Stake should only produce LBTC */
  supportedAssetsOut: AssetId[];

  /** Address validation Zod schema */
  addressSchema: z.ZodType<string>;

  /**
   * Get fee authorization config for a destination chain
   *
   * Returns FeeAuthConfig if fee auth is required for this destination,
   * null otherwise. When non-null, all FeeAuthConfig methods are guaranteed.
   *
   * @param destChain - Destination chain to check
   * @returns FeeAuthConfig or null
   */
  getFeeAuthConfig: (destChain: Chain) => FeeAuthConfig | null;

  /**
   * Acquire destination signature for deposit address generation
   *
   * Used for non-fee-auth chains or as fallback signature method.
   *
   * @param ctx - BTC core context with capabilities
   * @param recipient - Recipient address on destination chain
   * @param chainId - Parsed chain identifier
   * @returns Signature result with signature and optional metadata
   */
  getSignature: (
    ctx: BtcCoreContext,
    recipient: string,
    chainId: unknown,
  ) => Promise<SignatureResult>;
}
