/**
 * EVM Chain Service
 *
 * Operations for EVM-compatible blockchains provided by evmModule().
 * Used by strategies for contract interactions and fee authorization.
 */

import type { EvmProvider } from '../providers';

/**
 * Chain ID type (numeric EVM chain identifier)
 */
export type EvmChainId = number;

/**
 * Fee authorization result
 */
export interface FeeAuthorizationResult {
  signature: string;
  typedData?: string;
}

/**
 * Stored fee signature result (from resume flow)
 */
export interface StoredFeeSignature {
  hasSignature: boolean;
  signature?: string;
  typedData?: string;
  expirationDate?: string;
  isDelayed?: boolean;
}

/**
 * Network fee signing parameters
 */
export interface SignNetworkFeeParams {
  fee: string;
  account: string;
  chainId: EvmChainId;
  provider: EvmProvider;
  /** Token to sign for (LBTC or BTCb). Defaults to LBTC for backwards compatibility. */
  token?: string;
}

/**
 * Network fee signing result
 */
export interface SignNetworkFeeResult {
  signature: string;
  typedData: string;
}

/**
 * Stake and bake signing parameters
 */
export interface SignStakeAndBakeParams {
  value: string;
  account: string;
  chainId: EvmChainId;
  provider: EvmProvider;
  vaultKey: string;
  token: string;
  /**
   * Signature expiration as an absolute UNIX timestamp in seconds.
   * Defaults to 24 hours from the time of signing when omitted.
   *
   * Ignored by protocols whose approval config uses a zero deadline
   * (e.g. Silo BTC.b, which signs with no expiry).
   */
  expiry?: number;
}

/**
 * EVM Service Interface
 *
 * Provides all EVM-specific operations.
 * Injected into contexts as `ctx.evm`.
 */
export interface EvmService {
  /**
   * Get minting fee for a chain
   * @param chainId - The chain ID
   * @param token - Optional token (defaults to LBTC). Use 'BTCb' for BTC.b deposits.
   */
  getMintingFee(chainId: EvmChainId, token?: string): Promise<string>;

  /**
   * Sign network fee authorization (EIP-712)
   */
  signNetworkFee(params: SignNetworkFeeParams): Promise<SignNetworkFeeResult>;

  /**
   * Get stake and bake fee for a vault
   */
  getStakeAndBakeFee(chainId: EvmChainId, vaultKey: string): Promise<string>;

  /**
   * Sign stake and bake authorization
   */
  signStakeAndBake(
    params: SignStakeAndBakeParams,
  ): Promise<SignNetworkFeeResult>;

  /**
   * Sign LBTC destination address (for non-Ethereum EVM chains)
   */
  signLbtcDestination(params: {
    chainId: EvmChainId;
    address: string;
    provider: EvmProvider;
  }): Promise<{ signature: string }>;
}
