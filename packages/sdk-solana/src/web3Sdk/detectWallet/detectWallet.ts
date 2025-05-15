import {
  InjectedWallet,
  WindowWithSolanaInjectedWallets,
  SolanaWalletProvider,
} from '../../types/walletProviders';

export function getSolanaWalletProvider<T extends InjectedWallet>(
  injectedWallet: T,
): SolanaWalletProvider<T> {
  let walletProvider = undefined;
  if (typeof window !== 'undefined') {
    const WINDOW = window as WindowWithSolanaInjectedWallets;

    switch (injectedWallet) {
      case InjectedWallet.COINBASE: {
        walletProvider = WINDOW.coinbaseSolana;
        break;
      }
      case InjectedWallet.OKX: {
        walletProvider = WINDOW.okxwallet?.solana;
        break;
      }
      case InjectedWallet.PHANTOM: {
        walletProvider = WINDOW.phantom?.solana;
        break;
      }
    }
  }

  if (!walletProvider) {
    throw new Error(`Solana wallet provider for ${injectedWallet} not found.`);
  }

  return walletProvider as SolanaWalletProvider<T>;
}

export function isWalletAvailable(injectedWallet: InjectedWallet) {
  try {
    const provider = getSolanaWalletProvider(injectedWallet);
    return Boolean(provider);
  } catch (err) {
    console.info(`The ${injectedWallet} Solana wallet is not available.`);
  }

  return false;
}
