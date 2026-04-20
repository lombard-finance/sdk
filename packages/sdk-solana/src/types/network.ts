/**
 * Solana network types
 */
export const SolanaNetwork = {
  mainnet: 'mainnet-beta',
  testnet: 'testnet',
  devnet: 'devnet',
} as const;
export type SolanaNetwork = (typeof SolanaNetwork)[keyof typeof SolanaNetwork];
