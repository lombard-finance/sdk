/**
 * Sui Chain Service
 *
 * Operations for Sui blockchain provided by suiModule().
 * Used by strategies that mint/send to Sui.
 */
export interface SuiService {
  /**
   * Sign LBTC destination address for Sui minting
   * Required to generate a BTC deposit address for Sui destination
   */
  signLbtcDestination(args: {
    chainId: string;
  }): Promise<{ signature: string }>;

  /**
   * Unstake LBTC on Sui to receive BTC
   *
   * Burns LBTC on Sui and releases BTC to the provided Bitcoin address.
   *
   * @param args.amount - Amount of LBTC to unstake (BTC decimal, e.g., "0.001")
   * @param args.btcAddress - Bitcoin address to receive BTC
   * @param args.chainId - Sui chain ID ('sui:mainnet', 'sui:testnet')
   * @param args.env - Environment (prod, testnet, stage, dev)
   * @returns Transaction digest (hash)
   */
  unstake(args: {
    amount: string;
    btcAddress: string;
    chainId: string;
    env: string;
  }): Promise<{ txHash: string }>;
}
