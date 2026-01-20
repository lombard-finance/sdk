/**
 * Starknet Chain Service
 *
 * Operations for Starknet blockchain provided by starknetModule().
 * Used by strategies that mint/send to Starknet.
 */
export interface StarknetService {
  /**
   * Sign LBTC destination address for Starknet minting
   * Required to generate a BTC deposit address for Starknet destination
   */
  signLbtcDestination(args: {
    chainId: string;
  }): Promise<{ signature: string; pubKey: string }>;

  /**
   * Unstake LBTC on Starknet to receive BTC
   *
   * Burns LBTC on Starknet and releases BTC to the provided Bitcoin address.
   *
   * @param args.amount - Amount of LBTC to unstake (BTC decimal, e.g., "0.001")
   * @param args.btcAddress - Bitcoin address to receive BTC
   * @param args.env - Environment (prod, testnet, stage, dev)
   * @returns Transaction hash
   */
  unstake(args: {
    amount: string;
    btcAddress: string;
    env: string;
  }): Promise<{ txHash: string }>;
}
