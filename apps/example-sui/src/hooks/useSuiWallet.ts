import { getWallets, isSuiChain } from '@mysten/wallet-standard';
import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for Sui wallet connection using Wallet Standard
 *
 * Uses @mysten/wallet-standard for proper wallet discovery and connection
 */
export function useSuiWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wallet, setWallet] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [walletAccount, setWalletAccount] = useState<any | null>(null);

  // Get available Sui wallets
  const getSuiWallets = useCallback(() => {
    return getWallets()
      .get()
      .filter(w => w.chains.some(chain => isSuiChain(chain)));
  }, []);

  // Check for auto-connected wallets on mount
  useEffect(() => {
    const checkConnection = async () => {
      const wallets = getSuiWallets();

      for (const w of wallets) {
        // Check if wallet has accounts already connected
        if (w.accounts && w.accounts.length > 0) {
          const account = w.accounts[0];
          setWallet(w);
          setWalletAccount(account);
          setAddress(account.address);
          break;
        }
      }
    };

    checkConnection();

    // Subscribe to wallet registry changes
    const walletsApi = getWallets();
    const unsubscribe = walletsApi.on('register', () => {
      checkConnection();
    });

    return () => {
      unsubscribe();
    };
  }, [getSuiWallets]);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const wallets = getSuiWallets();

      if (wallets.length === 0) {
        throw new Error(
          'No Sui wallet detected. Please install Sui Wallet or Suiet extension.',
        );
      }

      // Use first available wallet (typically Phantom, Sui Wallet, or Suiet)
      const targetWallet = wallets[0];

      // Get connect feature
      const connectFeature = targetWallet.features['standard:connect'] as
        | {
            connect: () => Promise<{ accounts: Array<{ address: string }> }>;
          }
        | undefined;

      if (!connectFeature) {
        throw new Error('Wallet does not support connection.');
      }

      const result = await connectFeature.connect();
      const account = result?.accounts?.[0];

      if (!account) {
        throw new Error('No account returned from wallet');
      }

      setWallet(targetWallet);
      setWalletAccount(account);
      setAddress(account.address);
    } catch (err) {
      console.error('Failed to connect Sui wallet:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to connect Sui wallet',
      );
    } finally {
      setIsConnecting(false);
    }
  }, [getSuiWallets]);

  const disconnect = useCallback(async () => {
    try {
      if (wallet && wallet.features['standard:disconnect']) {
        const disconnectFeature = wallet.features['standard:disconnect'] as {
          disconnect: () => Promise<void>;
        };
        await disconnectFeature.disconnect();
      }

      setWallet(null);
      setWalletAccount(null);
      setAddress(null);
    } catch (err) {
      console.error('Failed to disconnect Sui wallet:', err);
    }
  }, [wallet]);

  return {
    address,
    isConnected: Boolean(address),
    isConnecting,
    error,
    connect,
    disconnect,
    wallet,
    walletAccount,
  };
}
