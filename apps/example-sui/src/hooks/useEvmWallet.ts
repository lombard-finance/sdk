/**
 * Stub hook for EVM wallet (not used in Sui example)
 *
 * StakingForm.tsx references this hook for auto-filling EVM addresses.
 * In the Sui example app, EVM wallet is not available.
 */
export function useEvmWallet() {
  return {
    address: null as string | null,
    isConnected: false,
  };
}
