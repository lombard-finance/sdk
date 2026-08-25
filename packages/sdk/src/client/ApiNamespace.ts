/**
 * API Namespace
 *
 * Provides convenient access to Lombard API data-fetching operations,
 * with environment pre-configured from SDK initialization.
 *
 * All API-related read operations are namespaced under `sdk.api.*`
 *
 * @example
 * ```ts
 * const sdk = new LombardSDK({ env: Env.prod, providers: {...} });
 *
 * // Fetch deposits for an address
 * const deposits = await sdk.api.deposits('0x...');
 *
 * // Fetch withdrawals with options
 * const withdrawals = await sdk.api.withdrawals('0x...', { show_redeems: true });
 *
 * // Fetch points (defaults to current season)
 * const points = await sdk.api.points('0x...');
 *
 * // Fetch LBTC exchange rate
 * const rate = await sdk.api.exchangeRatio();
 *
 * // Get existing BTC deposit address
 * const depositAddr = await sdk.api.depositAddress('0x...', ChainId.ethereum);
 * ```
 *
 * @module client/ApiNamespace
 */

import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import type BigNumber from 'bignumber.js';

import { getDepositBtcAddress } from '../api-functions/getDepositBtcAddress/getDepositBtcAddress';
import {
  type Deposit,
  getDepositsByAddress,
} from '../api-functions/getDepositsByAddress/getDepositsByAddress';
import { getExchangeRatio } from '../api-functions/getLBTCExchangeRate/get-exchange-ratio';
import {
  getPointsByAddress,
  type IPointsByAddressSeason1,
  type IPointsByAddressSeason2,
} from '../api-functions/getPointsByAddress/getPointsByAddress';
import {
  getUnstakesByAddress,
  type Unstake,
} from '../api-functions/getUnstakesByAddress/getUnstakesByAddress';
import type {
  ChainId,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from '../common/chains';
import type { Token } from '../tokens/token-addresses';
import {
  type EarnWithdrawals,
  getEarnWithdrawals,
  getEarnWithdrawalsAllChains,
} from '../vaults/lib/ops/get-vault-withdrawals';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Supported API versions (for future v2 migration) */
export type ApiVersion = 'v1' | 'v2';

/**
 * Options for fetching withdrawals.
 *
 * The field names are the query parameters the endpoint takes, so they keep the
 * wire's vocabulary rather than the SDK's.
 */
export interface WithdrawalOptions {
  /** Include redeem operations */
  show_redeems?: boolean;
  /** Include withdraw operations */
  show_unstakes?: boolean;
  /** Filter for native chain redemptions */
  to_native?: boolean;
}

/** Options for fetching exchange rate */
export interface ExchangeRateOptions {
  /** Chain ID (exchange rate is same for all chains, defaults to Ethereum) */
  chainId?: ChainId;
  /** Amount in satoshis to calculate exchange for */
  amount?: BigNumber.Value;
}

/** Options for fetching deposit address */
export interface DepositAddressOptions {
  /** Partner ID for the deposit address */
  partnerId?: string;
  /** Token type (LBTC, BTCK, BTCb) */
  token?: Token;
}

/** Destination chain types for deposit address */
export type DestinationChain =
  | ChainId
  | SuiChain
  | SolanaChain
  | StarknetChainId;

/** Options for fetching vault withdrawals */
export interface VaultWithdrawalsOptions {
  /** Filter by chain ID (if not provided, fetches from all chains) */
  chainId?: ChainId;
  /** Optional RPC URL override */
  rpcUrl?: string;
}

/* -------------------------------------------------------------------------- */
/*                              ApiNamespace                                  */
/* -------------------------------------------------------------------------- */

/**
 * API Namespace Class
 *
 * Provides convenient wrappers around Lombard API functions with
 * environment pre-bound from SDK configuration.
 *
 * Designed for easy migration to API v2 when available (January 2025).
 */
export class ApiNamespace {
  /**
   * Internal API version flag for future v2 migration.
   * When v2 is ready, we can switch implementations transparently.
   */
  private readonly apiVersion: ApiVersion = 'v1';

  constructor(private readonly env: Env = DEFAULT_ENV) {}

  /* -------------------------------------------------------------------------- */
  /*                               Deposits                                     */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetch all deposits for an address.
   *
   * Returns deposits from both Direct BTC Deposits and Native Deposits APIs,
   * unified into a single list sorted by block time (newest first).
   *
   * @param address - The EVM/BTC address to fetch deposits for
   * @returns Promise resolving to array of Deposit objects
   *
   * @example
   * ```ts
   * const deposits = await sdk.api.deposits('0x1234...');
   * deposits.forEach(d => {
   *   console.log(`${d.amount} BTC deposited at block ${d.blockHeight}`);
   * });
   * ```
   */
  async deposits(address: string): Promise<Deposit[]> {
    // Future: if (this.apiVersion === 'v2') return this.depositsV2(address);
    return getDepositsByAddress({ address, env: this.env });
  }

  /* -------------------------------------------------------------------------- */
  /*                              Withdrawals                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetch every withdrawal an address has made.
   *
   * Covers both arms: burning an L-asset for native BTC, and redeeming on the
   * destination chain. The record type is still `Withdraw` — that is the shape
   * the endpoint returns, and renaming it here would misdescribe the payload.
   *
   * @param address - The address that made the withdrawals
   * @param options - Optional filters (show_redeems, show_unstakes, to_native)
   * @returns Promise resolving to array of Withdraw objects
   *
   * @example
   * ```ts
   * // Every withdrawal
   * const withdrawals = await sdk.api.withdrawals('0x1234...');
   *
   * // Only native chain redemptions
   * const redeems = await sdk.api.withdrawals('0x1234...', { to_native: true });
   * ```
   */
  async withdrawals(
    address: string,
    options?: WithdrawalOptions,
  ): Promise<Unstake[]> {
    return getUnstakesByAddress({ address, env: this.env, options });
  }

  /* -------------------------------------------------------------------------- */
  /*                                Points                                      */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetch Lux points for an address (Season 1).
   *
   * @param address - The wallet address
   * @param season - Season number (1)
   * @returns Promise resolving to Season 1 points breakdown
   */
  async points(address: string, season: 1): Promise<IPointsByAddressSeason1>;

  /**
   * Fetch Lux points for an address (Season 2).
   *
   * @param address - The wallet address
   * @param season - Season number (2)
   * @returns Promise resolving to Season 2 points breakdown
   */
  async points(address: string, season: 2): Promise<IPointsByAddressSeason2>;

  /**
   * Fetch Lux points for an address (defaults to current season).
   *
   * @param address - The wallet address
   * @param season - Optional season number (defaults to current)
   * @returns Promise resolving to points breakdown
   *
   * @example
   * ```ts
   * // Get current season points
   * const points = await sdk.api.points('0x1234...');
   * console.log(`Total: ${points.totalPoints}, Holding: ${points.holdingPoints}`);
   *
   * // Get Season 1 points
   * const s1 = await sdk.api.points('0x1234...', 1);
   * ```
   */
  async points(
    address: string,
    season?: number,
  ): Promise<IPointsByAddressSeason1 | IPointsByAddressSeason2>;

  async points(
    address: string,
    season?: number,
  ): Promise<IPointsByAddressSeason1 | IPointsByAddressSeason2> {
    // Future: if (this.apiVersion === 'v2') return this.pointsV2(address, season);
    return getPointsByAddress({ address, env: this.env, season });
  }

  /* -------------------------------------------------------------------------- */
  /*                          Token Exchange Ratios                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetch the current exchange ratios for all supported tokens.
   *
   * Returns Token:BTC and BTC:Token ratios for LBTC and other supported tokens.
   * This is the recommended method for getting exchange rate information.
   *
   * @returns Promise resolving to exchange ratio info for each token
   *
   * @example
   * ```ts
   * const ratios = await sdk.api.exchangeRatio();
   *
   * // Access LBTC ratios
   * const lbtcRatio = ratios.LBTC;
   * console.log(`LBTC:BTC = ${lbtcRatio.tokenBTCRatio}`);  // How many LBTC per 1 BTC
   * console.log(`BTC:LBTC = ${lbtcRatio.BTCTokenRatio}`);  // How many BTC per 1 LBTC
   * ```
   */
  async exchangeRatio() {
    return getExchangeRatio({ env: this.env });
  }

  /* -------------------------------------------------------------------------- */
  /*                           Deposit Address                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Get an existing BTC deposit address for a recipient.
   *
   * Returns the most recent non-deprecated deposit address for the
   * given recipient address and destination chain.
   *
   * @param address - The destination address where LBTC will be claimed
   * @param chainId - The destination chain
   * @param options - Optional partner ID and token type
   * @returns Promise resolving to the BTC deposit address
   * @throws Error if no deposit address found
   *
   * @example
   * ```ts
   * try {
   *   const btcAddr = await sdk.api.depositAddress('0x1234...', ChainId.ethereum);
   *   console.log(`Send BTC to: ${btcAddr}`);
   * } catch (e) {
   *   console.log('No deposit address found - need to generate one');
   * }
   * ```
   */
  async depositAddress(
    address: string,
    chainId: DestinationChain,
    options?: DepositAddressOptions,
  ): Promise<string> {
    // Future: if (this.apiVersion === 'v2') return this.depositAddressV2(address, chainId, options);
    return getDepositBtcAddress({
      address,
      chainId,
      env: this.env,
      partnerId: options?.partnerId,
      token: options?.token,
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                          Vault Withdrawals                                 */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetch all vault withdrawals for an address.
   *
   * Returns withdrawal objects categorized by status (cancelled, expired,
   * fulfilled, open). If chainId is not provided, fetches from all supported chains.
   *
   * @param address - The address to fetch withdrawals for
   * @param options - Optional filters (chainId, vault, rpcUrl)
   * @returns Promise resolving to categorized vault withdrawals
   *
   * @example
   * ```ts
   * // Get all withdrawals from all chains
   * const result = await sdk.api.vaultWithdrawals('0x1234...');
   * console.log(`Open: ${result.open.length}, Fulfilled: ${result.fulfilled.length}`);
   *
   * // Filter by specific chain
   * const ethereumOnly = await sdk.api.vaultWithdrawals('0x1234...', {
   *   chainId: ChainId.ethereum,
   * });
   *
   * // Display withdrawal info
   * result.open.forEach(w => {
   *   console.log(`Amount: ${w.shareAmount.toFixed()}, Deadline: ${new Date(w.deadline * 1000)}`);
   * });
   * ```
   */
  async vaultWithdrawals(
    address: string,
    options?: VaultWithdrawalsOptions,
  ): Promise<EarnWithdrawals> {
    const account = address as `0x${string}`;

    if (options?.chainId) {
      // Fetch from specific chain
      return getEarnWithdrawals({
        account,
        chainId: options.chainId,
        rpcUrl: options.rpcUrl,
        env: this.env,
      });
    }

    // Fetch from all chains
    return getEarnWithdrawalsAllChains({
      account,
      rpcUrl: options?.rpcUrl,
      env: this.env,
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                            Utility Methods                                 */
  /* -------------------------------------------------------------------------- */

  /**
   * Get the current API version being used.
   *
   * @returns The API version string ('v1' or 'v2')
   */
  getApiVersion(): ApiVersion {
    return this.apiVersion;
  }
}
