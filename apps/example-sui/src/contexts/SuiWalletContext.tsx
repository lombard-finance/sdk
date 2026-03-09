import { getWallets, isSuiChain } from '@mysten/wallet-standard';
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';

interface SuiWalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wallet: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletAccount: any | null;
}

export const SuiWalletContext = createContext<SuiWalletState>({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: async () => {},
  wallet: null,
  walletAccount: null,
});

export function SuiWalletProvider({ children }: { children: ReactNode }) {
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

      const targetWallet = wallets[0];

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

  return (
    <SuiWalletContext.Provider
      value={{
        address,
        isConnected: Boolean(address),
        isConnecting,
        error,
        connect,
        disconnect,
        wallet,
        walletAccount,
      }}
    >
      {children}
    </SuiWalletContext.Provider>
  );
}
