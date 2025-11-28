import { PublicKey } from '@solana/web3.js';

export enum InjectedWallet {
  PHANTOM = 'phantom',
  OKX = 'okx',
  COINBASE = 'coinbase',
  BACKPACK = 'backpack',
  SOLFLARE = 'solflare',
}

/**
 * The Solana wallet interface.
 */
export interface ISolanaWalletProvider {
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
export interface PhantomWalletProvider extends ISolanaWalletProvider {
  isPhantom?: boolean;
}

/**
 * Interface for OKX wallet provider
 */
export interface OkxWalletProvider extends ISolanaWalletProvider {
  isOkxWallet?: boolean;
}

/**
 * Interface for Coinbase wallet provider
 */
export interface CoinbaseWalletProvider extends ISolanaWalletProvider {
  isCoinbaseWallet?: boolean;
}

/**
 * Interface for Backpack wallet provider
 */
export interface BackpackWalletProvider extends ISolanaWalletProvider {
  isBackpack?: boolean;
}

/**
 * Interface for Solflare wallet provider
 */
export interface SolflareWalletProvider extends ISolanaWalletProvider {
  isSolflare?: boolean;
}

export type SolanaWalletProvider<T extends InjectedWallet> =
  T extends InjectedWallet.COINBASE
    ? CoinbaseWalletProvider
    : T extends InjectedWallet.OKX
      ? OkxWalletProvider
      : T extends InjectedWallet.PHANTOM
        ? PhantomWalletProvider
        : T extends InjectedWallet.BACKPACK
          ? BackpackWalletProvider
          : T extends InjectedWallet.SOLFLARE
            ? SolflareWalletProvider
            : undefined;

export interface WindowWithSolanaInjectedWallets extends Window {
  /** The injected PHANTOM wallet with Solana support */
  phantom?: { solana?: PhantomWalletProvider };

  /** The injected OKX wallet with Solana support */
  okxwallet?: { solana?: OkxWalletProvider };

  /** The injected COINBASE wallet with Solana support */
  coinbaseSolana?: CoinbaseWalletProvider;

  /** The injected BACKPACK wallet with Solana support */
  backpack?: { solana?: BackpackWalletProvider };

  /** The injected SOLFLARE wallet with Solana support */
  solflare?: SolflareWalletProvider;
}
