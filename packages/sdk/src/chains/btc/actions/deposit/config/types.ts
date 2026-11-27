/**
 * BTC Deposit Chain Configuration Types
 *
 * @module chains/btc/actions/deposit/config/types
 */

import type { Env } from '@lombard.finance/sdk-common';
import type { z } from 'zod';

import type { AssetId, Chain, ChainType } from '../../../../../core';
import type { BtcCoreContext } from '../../../../../shared/context';

/**
 * Stored fee signature result
 */
export interface StoredFeeSignature {
  hasSignature: boolean;
  signature?: string;
  typedData?: string;
}

/**
 * Fee authorization result
 */
export interface FeeAuthResult {
  signature: string;
  typedData?: string;
}

/**
 * Signature result for address confirmation
 */
export interface SignatureResult {
  signature: string;
  typedData?: string;
}

/**
 * Route definition for deposit configs
 */
export interface DepositRouteDefinition {
  sourceChains: Chain[];
  envs: Env[];
}

/**
 * Fee authorization configuration
 *
 * When present, ALL methods are guaranteed to exist.
 * Used for chains that require fee authorization (e.g., Ethereum mainnet).
 */
export interface DepositFeeAuthConfig {
  /**
   * Get the minting fee for this chain (in BTC)
   * Called in prepare() when fee authorization is needed
   */
  getMintingFee: (ctx: BtcCoreContext, chainId: unknown) => Promise<string>;

  /**
   * Try to restore a stored fee signature (resume flow)
   */
  restoreFeeSignature: (
    ctx: BtcCoreContext,
    chainId: unknown,
    address: string,
  ) => Promise<StoredFeeSignature | null>;

  /**
   * Authorize fee (EIP-712 signing)
   */
  authorizeFee: (
    ctx: BtcCoreContext,
    params: {
      chainId: unknown;
      recipient: string;
      fee: string;
      // False while the signature is about to travel with generateDepositAddress,
      // which registers it server-side. Registering it twice reads as a reuse.
      storeSignature?: boolean;
    },
  ) => Promise<FeeAuthResult>;
}

/**
 * Deposit chain configuration
 *
 * BTC Deposit produces BTC.b (wrapped BTC without yield).
 * Each supported chain type implements this interface.
 * Fee authorization is only required for Ethereum mainnet.
 * Other chains use address confirmation signing.
 */
export interface DepositChainConfig {
  chainType: ChainType;
  routes: DepositRouteDefinition[];
  destChains: Chain[];
  /** Supported output assets - BTC Deposit should only produce BTC.b */
  supportedAssetsOut: AssetId[];
  addressSchema: z.ZodType<string>;

  /**
   * Get fee authorization config for a destination chain
   *
   * Returns DepositFeeAuthConfig if fee auth is required (Ethereum mainnet),
   * null otherwise (address confirmation will be used instead).
   */
  getFeeAuthConfig: (destChain: Chain) => DepositFeeAuthConfig | null;

  /**
   * Sign destination address confirmation
   * Used for non-fee-auth chains
   */
  signDestination: (
    ctx: BtcCoreContext,
    recipient: string,
    chainId: unknown,
  ) => Promise<SignatureResult>;
}
