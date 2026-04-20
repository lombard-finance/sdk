import { useContext } from 'react';

import { EvmWalletContext } from '../contexts/EvmWalletContext';

/**
 * Hook to access shared EVM wallet state.
 * Must be used within an EvmWalletProvider.
 */
export function useEvmWallet() {
  return useContext(EvmWalletContext);
}

// Type declaration for window.ethereum
// Using any to avoid type conflicts with viem's strict EIP1193 types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}
