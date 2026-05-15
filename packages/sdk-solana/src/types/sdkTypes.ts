import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';

import { SolanaNetwork } from './network';

/**
 * Parameters for getting a balance
 */
export interface GetBalanceParams {
  /**
   * The public key to get the balance for
   */
  publicKey: string;

  /**
   * Optional token address for SPL tokens
   */
  tokenAddress?: string;

  /**
   * Optional Solana network to use
   * @default 'devnet'
   */
  network?: SolanaNetwork;

  /**
   * Optional custom RPC URL to use
   * If provided, overrides the network parameter
   */
  rpcUrl?: string;

  /**
   * Optional environment. Determines which BFF host (prod vs stage) the
   * default RPC URL routes through when `rpcUrl` is not provided.
   */
  env?: Env;
}

/**
 * Result of a get balance operation
 */
export interface GetBalanceResult {
  /**
   * The total balance
   */
  total: BigNumber;

  /**
   * The number of decimals for the token
   */
  decimals: number;
}

/**
 * Parameters for checking a valid address
 */
export interface IsValidAddressParams {
  /**
   * The address to validate
   */
  address: string;
}

/**
 * Result of an address validation check
 */
export interface IsValidAddressResult {
  /**
   * Whether the address is valid
   */
  isValid: boolean;
}
