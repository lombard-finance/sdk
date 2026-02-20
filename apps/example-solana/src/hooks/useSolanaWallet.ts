import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for Solana wallet connection using Phantom or other Solana wallets
 *
 * Provides functions to connect/disconnect Solana wallet and monitor connection status.
 */
export function useSolanaWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined' || !window.solana) return;

      try {
        const response = await window.solana.connect({ onlyIfTrusted: true });
        if (response.publicKey) {
          setAddress(response.publicKey.toString());
        }
      } catch (err) {
        // Silent error - wallet not connected yet
        console.debug('Solana wallet not connected:', err);
      }
    };

    checkConnection();
  }, []);

  // Listen for wallet account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.solana) return;

    const handleAccountChange = (...args: unknown[]) => {
      const publicKey = args[0] as { toString(): string } | null;
      if (publicKey) {
        setAddress(publicKey.toString());
      } else {
        setAddress(null);
      }
    };

    window.solana.on('accountChanged', handleAccountChange);

    return () => {
      window.solana?.removeListener('accountChanged', handleAccountChange);
    };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.solana) {
      setError(
        'Solana wallet (Phantom) not detected. Please install Phantom wallet.',
      );
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await window.solana.connect();
      if (response.publicKey) {
        setAddress(response.publicKey.toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.solana) return;

    try {
      await window.solana.disconnect();
      setAddress(null);
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
    }
  }, []);

  return {
    address,
    isConnecting,
    error,
    connect,
    disconnect,
    isConnected: !!address,
  };
}

// Type declaration for window.solana (Phantom wallet)
// Using any to avoid type conflicts with SDK's SolanaProvider types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    solana?: any;
  }
}
