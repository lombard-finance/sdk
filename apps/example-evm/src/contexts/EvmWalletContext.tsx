import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';

interface EvmWalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: string) => Promise<void>;
}

export const EvmWalletContext = createContext<EvmWalletState>({
  address: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  switchNetwork: async () => {},
});

export function EvmWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = (await window.ethereum.request({
            method: 'eth_accounts',
          })) as string[];

          if (accounts.length > 0) {
            setAddress(accounts[0]);
            setIsConnected(true);
          }
        } catch (err) {
          console.error('Failed to check wallet connection:', err);
        }
      }
    };

    checkConnection();

    if (window.ethereum && typeof window.ethereum.on === 'function') {
      const handleAccountsChanged = (...args: unknown[]) => {
        const accounts = args[0] as string[];
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        } else {
          setAddress(null);
          setIsConnected(false);
        }
      };

      try {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
      } catch (err) {
        console.warn('Failed to subscribe to accountsChanged:', err);
        return;
      }

      return () => {
        try {
          window.ethereum?.removeListener(
            'accountsChanged',
            handleAccountsChanged,
          );
        } catch {
          // Provider may not support removeListener
        }
      };
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('No web3 wallet detected. Please install MetaMask.');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
  }, []);

  /**
   * Switch wallet to a specific chain.
   * Accepts an eip155-prefixed chain ID (e.g. "eip155:84532") or a numeric string.
   */
  const switchNetwork = useCallback(async (chainId: string) => {
    if (typeof window.ethereum === 'undefined') return;

    // Extract numeric chain ID from eip155 format
    const numericId = chainId.startsWith('eip155:')
      ? chainId.split(':')[1]
      : chainId;
    const hexChainId = `0x${parseInt(numericId, 10).toString(16)}`;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (err: unknown) {
      // Error code 4902 means the chain hasn't been added to the wallet
      const switchError = err as { code?: number };
      if (switchError.code === 4902) {
        throw new Error(
          `Chain ${numericId} is not configured in your wallet. Please add it manually.`,
        );
      }
      throw err;
    }
  }, []);

  return (
    <EvmWalletContext.Provider
      value={{ address, isConnected, isConnecting, error, connect, disconnect, switchNetwork }}
    >
      {children}
    </EvmWalletContext.Provider>
  );
}
