import { useCallback, useEffect, useState } from 'react';

/**
 * Simple EVM wallet connection hook
 * Uses MetaMask or other injected web3 provider
 */
export function useEvmWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet is already connected
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

    // Listen for account changes
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

  /**
   * Connect to wallet
   */
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

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
  }, []);

  return {
    address,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
  };
}

// Type declaration for window.ethereum
// Using any to avoid type conflicts with viem's strict EIP1193 types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}
