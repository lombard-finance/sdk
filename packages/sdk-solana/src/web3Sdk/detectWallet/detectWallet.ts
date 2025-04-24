import { WALLET_NOT_FOUND_ERROR } from '../../const/errors';
import {
  CoinbaseProvider,
  OkxProvider,
  PhantomProvider,
  WalletType,
  WindowWithWallets,
} from '../../types/walletProviders';

/**
 * Check if the window object is available (browser environment)
 * @returns A boolean indicating if window is available
 */
export function isWindowAvailable(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Detect if a specific wallet is available in the browser
 * @param walletType The type of wallet to detect
 * @returns A boolean indicating if the wallet is available
 */
export function isWalletAvailable(walletType: WalletType): boolean {
  if (!isWindowAvailable()) return false;

  const win = window as WindowWithWallets;

  switch (walletType) {
    case 'phantom':
      return win.phantom !== undefined;
    case 'okx':
      return win.okxwallet !== undefined;
    case 'coinbase':
      return win.coinbaseSolana !== undefined;
    default:
      return false;
  }
}

type WalletProvider<T extends WalletType> = {
  solana: T extends 'phantom'
    ? PhantomProvider
    : T extends 'okx'
      ? OkxProvider
      : CoinbaseProvider;
};

/**
 * Get a wallet provider based on wallet type
 * @param walletType The type of wallet to get
 * @returns The wallet provider
 * @throws WALLET_NOT_FOUND_ERROR if wallet is not found
 */
export function getWalletProvider<T extends WalletType>(
  walletType: T,
): WalletProvider<T> {
  if (!isWalletAvailable(walletType)) {
    throw WALLET_NOT_FOUND_ERROR;
  }

  const win = window as WindowWithWallets;

  switch (walletType) {
    case 'phantom':
      return win.phantom as unknown as WalletProvider<T>;
    case 'okx':
      return win.okxwallet as unknown as WalletProvider<T>;
    case 'coinbase':
      return {
        isCoinbaseWallet: true,
        solana: win.coinbaseSolana,
      } as unknown as WalletProvider<T>;
    default:
      throw WALLET_NOT_FOUND_ERROR;
  }
}

/**
 * Get the Solana provider from a wallet
 * @param walletType The type of wallet to get the provider from
 * @returns The Solana provider
 * @throws WALLET_NOT_FOUND_ERROR if wallet is not found
 */
export function getSolanaWalletProvider<T extends WalletType>(walletType: T) {
  const walletProvider = getWalletProvider(walletType);

  switch (walletType) {
    case 'phantom':
      return walletProvider.solana;
    case 'okx':
      return walletProvider.solana;
    case 'coinbase':
      return walletProvider.solana;
    default:
      throw WALLET_NOT_FOUND_ERROR;
  }
}
