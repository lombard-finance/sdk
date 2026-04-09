import type { Env } from "../env";

/**
 * Solana Chain Service
 *
 * Operations for Solana blockchain provided by solanaModule().
 * Used by strategies that mint/send to Solana.
 */
export interface SolanaService {
  /**
   * Sign LBTC destination address for Solana minting
   * Required to generate a BTC deposit address for Solana destination
   */
  signLbtcDestination(args: {
    network: string;
  }): Promise<{ signature: string }>;

  /**
   * Unstake LBTC on Solana to receive BTC
   *
   * Burns LBTC on Solana and releases BTC to the provided Bitcoin address.
   *
   * @param args.amount - Amount of LBTC to unstake in base units (satoshis)
   * @param args.btcAddress - Bitcoin address to receive BTC
   * @param args.network - Solana network ('mainnet-beta', 'devnet', 'testnet')
   * @returns Transaction signature
   */
  unstake(args: {
    amount: string;
    btcAddress: string;
    network: string;
  }): Promise<{ txHash: string }>;

  /**
   * Redeem BTC.b on Solana to receive BTC
   *
   * Burns BTC.b on Solana and sends a GMP message to trigger
   * a BTC payout to the specified Bitcoin address.
   *
   * @param args.amount - Amount of BTC.b to redeem in base units (satoshis)
   * @param args.btcAddress - Bitcoin address to receive BTC
   * @param args.network - Solana network ('mainnet-beta', 'devnet', 'testnet')
   * @returns Transaction signature
   */
  redeemForBtc(args: {
    amount: string;
    btcAddress: string;
    network: string;
    env?: Env;
  }): Promise<{ txHash: string }>;
}
