import type { Env } from '../env';

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
   * Redeem BTC.b or LBTC on Solana to receive BTC
   *
   * Burns the source token on Solana and sends a GMP message to trigger
   * a BTC payout to the specified Bitcoin address.
   *
   * @param args.amount - Amount to redeem in base units (satoshis)
   * @param args.btcAddress - Bitcoin address to receive BTC
   * @param args.network - Solana network ('mainnet-beta', 'devnet', 'testnet')
   * @param args.tokenMint - Optional source token mint. Pass LBTC mint for LBTC flow; defaults to BTC.b.
   * @returns Transaction signature
   */
  redeemForBtc(args: {
    amount: string;
    btcAddress: string;
    network: string;
    env?: Env;
    tokenMint?: string;
  }): Promise<{ txHash: string }>;

  /**
   * Redeem tokens via Asset Router's generic `redeem` instruction.
   *
   * Burns the source token (default LBTC) and sends a GMP message through
   * the Mailbox to route the destination token (default BTC.b) to the recipient.
   *
   * @param args.amount - Amount in base units (satoshis)
   * @param args.recipient - Recipient address on the destination chain (Solana base58)
   * @param args.network - Solana network
   * @returns Transaction signature
   */
  redeem(args: {
    amount: string;
    recipient: string;
    network: string;
    env?: Env;
    tokenMint?: string;
    toLchainId?: string;
    toTokenAddress?: string;
  }): Promise<{ txHash: string }>;

  /**
   * Deposit source token (default BTC.b) to receive destination token (default LBTC)
   * via Asset Router's `deposit` instruction.
   *
   * Burns the source token and sends a GMP message through the Mailbox
   * to mint the destination token to the recipient.
   *
   * @param args.amount - Amount in base units (satoshis)
   * @param args.recipient - Recipient address (Solana base58)
   * @param args.network - Solana network
   * @returns Transaction signature
   */
  deposit(args: {
    amount: string;
    recipient: string;
    network: string;
    env?: Env;
    sourceTokenMint?: string;
    toLchainId?: string;
    toTokenAddress?: string;
  }): Promise<{ txHash: string }>;
}
