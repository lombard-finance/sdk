import { useContext } from "react";

import { SolanaWalletContext } from "../contexts/SolanaWalletContext";

/**
 * Hook to access shared Solana wallet state.
 * Must be used within a SolanaWalletProvider.
 */
export function useSolanaWallet() {
  return useContext(SolanaWalletContext);
}

// Type declaration for window.solana (Phantom wallet)
// Using any to avoid type conflicts with SDK's SolanaProvider types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    solana?: any;
  }
}
