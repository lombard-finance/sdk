/**
 * Stub hook for EVM wallet (not used in Solana app)
 *
 * StakingForm.tsx references this hook for auto-filling EVM addresses.
 * In the Solana app, EVM wallet is not available, so this returns disconnected state.
 */
export function useEvmWallet() {
  return {
    address: null as string | null,
    isConnected: false,
  };
}
