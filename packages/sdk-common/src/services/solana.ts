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
}
