/**
 * BTC Chain Service
 *
 * Operations for Bitcoin blockchain provided by btcModule().
 * Used by strategies for BTC deposit monitoring and address operations.
 */

/**
 * Network mode for Bitcoin operations
 */
export type BtcNetworkMode = "mainnet" | "testnet";

/**
 * BTC Service Interface
 *
 * Provides Bitcoin-specific operations.
 * Injected into BtcCoreContext as `ctx.btc`.
 */
export interface BtcService {
  /**
   * Get current block height from mempool
   */
  getCurrentBlockHeight(network: BtcNetworkMode): Promise<number>;
}
