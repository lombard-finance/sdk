import { useContext } from 'react';

import { SuiWalletContext } from '../contexts/SuiWalletContext';

/**
 * Hook to access shared Sui wallet state.
 * Must be used within a SuiWalletProvider.
 */
export function useSuiWallet() {
  return useContext(SuiWalletContext);
}
