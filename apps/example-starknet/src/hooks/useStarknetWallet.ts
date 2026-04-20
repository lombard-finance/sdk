import { useContext } from 'react';

import { StarknetWalletContext } from '../contexts/StarknetWalletContext';

// Re-export the enum so existing imports continue to work
export { StarknetWalletId } from '../contexts/StarknetWalletContext';

/**
 * Hook to access shared Starknet wallet state.
 * Must be used within a StarknetWalletProvider.
 */
export function useStarknetWallet() {
  return useContext(StarknetWalletContext);
}
