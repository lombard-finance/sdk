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
 * const sdk = await createLombardSDK({ env: Env.prod, providers: {...} });
 *
 * // Fetch deposits for an address
 * const deposits = await sdk.api.deposits('0x...');
 *
 * // Fetch withdrawals with options
 * const withdrawals = await sdk.api.withdrawals('0x...', { show_redeems: true });
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

import { DEFAULT_ENV, Env, LombardAuth } from '@lombard.finance/sdk-common';
import type BigNumber from 'bignumber.js';

import { getDepositBtcAddress } from '../api-functions/getDepositBtcAddress/getDepositBtcAddress';
import {
  type Deposit,
  getDepositsByAddress,
} from '../api-functions/getDepositsByAddress/getDepositsByAddress';
import { getExchangeRatio } from '../api-functions/getLBTCExchangeRate/get-exchange-ratio';
import {
  getPortfolioBridges,
  getPortfolioDeposits,
  getPortfolioWithdrawals,
} from '../api-functions/getPortfolioMovements/getPortfolioMovements';
import type { PortfolioBridge } from '../api-functions/getPortfolioMovements/movements';
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
import type { ApiVersion } from '../config/types';
import { AuthErrorCode, LombardError } from '../shared/errors';
import type { Token } from '../tokens/token-addresses';
import {
  type EarnWithdrawals,
  getEarnWithdrawals,
  getEarnWithdrawalsAllChains,
} from '../vaults/lib/ops/get-vault-withdrawals';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type { ApiVersion } from '../config/types';

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
 * Deposits and withdrawals read the public v1 routes, or the v2 portfolio
 * lists when the config sets `apiVersion: 'v2'` and `auth` yields a token.
 */
export class ApiNamespace {
  /**
   * @param env - Which deployment to address.
   * @param auth - How to obtain a wallet JWT, from `LombardConfig.auth`.
   * @param apiVersion - Which API deposits and withdrawals read, from
   *   `LombardConfig.apiVersion`.
   *
   *   The v2 portfolio lists are user-scoped and refuse to send without a
   *   token. The vault withdrawal reads are public: their route takes no
   *   token, so none is sent there.
   */
  constructor(
    private readonly env: Env = DEFAULT_ENV,
    private readonly auth?: LombardAuth,
    private readonly apiVersion: ApiVersion = 'v1',
  ) {}

  /* -------------------------------------------------------------------------- */
  /*                               Deposits                                     */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetch all deposits for an address.
   *
   * BTC and BTC.b deposits whose destination is `address`, in one list,
   * newest first. Read from the public v1 routes, or from the v2 portfolio
   * list with `apiVersion: 'v2'` and a wallet token for `address`; both return
   * the same `Deposit` shape.
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
    return this.preferV2(
      () => getPortfolioDeposits({ address, env: this.env, auth: this.auth }),
      () => getDepositsByAddress({ address, env: this.env }),
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                              Withdrawals                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetch every withdrawal an address has made.
   *
   * Covers both arms: burning an L-asset for native BTC, and redeeming on the
   * destination chain. Read from the public v1 route, or from the v2 portfolio
   * list with `apiVersion: 'v2'` and a wallet token for `address`. The record
   * type is still `Unstake`: that is the shape the endpoint returns, and
   * renaming it here would misdescribe the payload.
   *
   * @param address - The address that made the withdrawals
   * @param options - Optional filters (show_redeems, show_unstakes, to_native)
   * @returns Promise resolving to the address's `Unstake` records
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
    return this.preferV2(
      () =>
        getPortfolioWithdrawals({
          address,
          env: this.env,
          auth: this.auth,
          options,
        }),
      () => getUnstakesByAddress({ address, env: this.env, options }),
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                                 Bridges                                    */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetch every bridge transfer an address has sent between chains.
   *
   * Reads `/v2/portfolio/{address}/bridges`, which is user-scoped: it needs
   * `auth` on the SDK config and a wallet token for this address. There is no
   * public fallback.
   *
   * @param address - The address that sent the transfers
   * @returns Promise resolving to the transfers, newest first
   * @throws `LombardError` with `AuthErrorCode.MISSING_TOKEN` when no wallet
   *   token is available
   */
  async bridges(address: string): Promise<PortfolioBridge[]> {
    return getPortfolioBridges({ address, env: this.env, auth: this.auth });
  }

  /**
   * With `apiVersion: 'v2'`, reads v2 when a wallet token is available and the
   * public v1 route otherwise, so a caller that has not signed in keeps
   * working. Only a missing token falls back: any other v2 failure is the
   * caller's to see.
   */
  private async preferV2<T>(
    readV2: () => Promise<T>,
    readV1: () => Promise<T>,
  ): Promise<T> {
    if (this.apiVersion !== 'v2' || !this.auth) return readV1();
    try {
      return await readV2();
    } catch (error) {
      if (
        error instanceof LombardError &&
        error.code === AuthErrorCode.MISSING_TOKEN
      ) {
        return readV1();
      }
      throw error;
    }
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
   * The API version deposits and withdrawals are read from, as configured.
   * With `v2`, a call that has no wallet token still reads v1.
   *
   * @returns The API version string ('v1' or 'v2')
   */
  getApiVersion(): ApiVersion {
    return this.apiVersion;
  }
}
