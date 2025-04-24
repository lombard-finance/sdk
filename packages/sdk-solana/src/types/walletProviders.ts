import { PublicKey } from '@solana/web3.js';

/**
 * Represents the wallet types supported for Solana
 */
export const WalletType = {
  phantom: 'phantom',
  okx: 'okx',
  coinbase: 'coinbase',
} as const;
export type WalletType = (typeof WalletType)[keyof typeof WalletType];

/**
 * Interface for Solana wallet providers
 */
export interface SolanaProviderInterface {
  /**
   * Whether the wallet is connected
   */
  isConnected: boolean;

  /**
   * The public key of the connected account
   */
  publicKey: PublicKey;

  /**
   * Connects to the wallet
   * @returns The public key of the connected account
   */
  connect: (args?: unknown) => Promise<void>;

  /**
   * Disconnects from the wallet
   */
  disconnect: () => Promise<void>;

  /**
   * Signs a message using the connected account
   * @param message Message to sign
   * @returns Signature and public key
   */
  signMessage: (
    message: Uint8Array,
  ) => Promise<{ signature: Uint8Array; publicKey: PublicKey }>;

  /**
   * Signs a transaction
   * @param transaction Transaction to sign
   * @returns Signed transaction
   */
  signTransaction: <T>(transaction: T) => Promise<T>;

  /**
   * Signs multiple transactions
   * @param transactions Transactions to sign
   * @returns Signed transactions
   */
  signAllTransactions: <T>(transactions: T[]) => Promise<T[]>;
}

/**
 * Interface for Phantom wallet provider
 */
export interface PhantomProvider extends SolanaProviderInterface {
  isPhantom?: boolean;
}

/**
 * Interface for OKX wallet provider
 */
export interface OkxProvider extends SolanaProviderInterface {
  isOkxWallet?: boolean;
}

/**
 * Interface for Coinbase wallet provider
 */
export interface CoinbaseProvider extends SolanaProviderInterface {
  isCoinbaseWallet?: boolean;
}

/**
 * Extended Window interface with wallet providers
 */
export interface WindowWithWallets extends Window {
  phantom?: { solana: PhantomProvider };
  okxwallet?: { solana: OkxProvider };
  coinbaseSolana?: CoinbaseProvider;
}
