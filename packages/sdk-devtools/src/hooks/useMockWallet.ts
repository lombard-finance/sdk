/**
 * useMockWallet - Simulated wallet for testing SDK flows
 *
 * Provides mock addresses for exploring SDK without connecting a real wallet.
 *
 * IMPORTANT LIMITATIONS:
 * The mock wallet provides valid addresses for UI exploration and auto-filling
 * recipient fields. However, it CANNOT perform actual wallet operations:
 * - EIP-712 signature signing (fee authorization)
 * - Transaction signing
 * - Message signing
 *
 * For full flow testing, connect a real wallet.
 *
 * @module sdk-devtools/hooks/useMockWallet
 */

import { useCallback, useMemo, useState } from "react";

import type { MockAddresses, MockWalletState } from "../types";

// ─────────────────────────────────────────────────────────────────
// Mock Addresses
// ─────────────────────────────────────────────────────────────────

/**
 * Deterministic mock addresses for consistent testing.
 * Uses well-known addresses that are valid for each chain type.
 */
export const MOCK_ADDRESSES: MockAddresses = {
  // Vitalik's address (properly checksummed)
  evm: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  // Valid mainnet bitcoin address
  bitcoin: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  // Valid Solana address
  solana: "DRpbCBMxVnDK7maPMxTm9dRYNLGhPEYALmJY9VvUdWTm",
  // Valid Sui address
  sui: "0x7d20dcdb2bca4f508ea9613994683eb4e76e9cc555c8e2d4f8362e10e4eca31b",
  // Valid Starknet address
  starknet:
    "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
};

// ─────────────────────────────────────────────────────────────────
// Limitations
// ─────────────────────────────────────────────────────────────────

/**
 * Mock wallet limitations - clearly document what it can/cannot do
 */
export const MOCK_WALLET_LIMITATIONS = {
  /** Cannot sign transactions */
  cannotSign: true,

  /** Steps that work with mock wallet */
  supportedSteps: ["Create", "Prepare"] as const,

  /** Steps that require real wallet */
  unsupportedSteps: ["Authorize", "Sign", "Execute"] as const,

  /** User-friendly message */
  message:
    "Mock wallet cannot sign transactions. Connect a real wallet for full flow.",

  /** Short message for badges */
  shortMessage: "Cannot sign - connect real wallet",
};

// ─────────────────────────────────────────────────────────────────
// Storage Key
// ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "lombard-devtools-mock-wallet";

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

/**
 * Hook for managing mock wallet state
 *
 * Provides a mock wallet that auto-fills addresses but cannot sign transactions.
 * State is persisted in localStorage.
 *
 * @example
 * ```tsx
 * const mockWallet = useMockWallet();
 *
 * if (!connectedWallet && !mockWallet.isEnabled) {
 *   return <button onClick={mockWallet.enable}>Use Mock Wallet</button>;
 * }
 *
 * const address = connectedWallet?.address ?? mockWallet.address;
 * ```
 */
export function useMockWallet(): MockWalletState {
  // Load initial state from localStorage
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const [chainId, setChainId] = useState(1); // Default to Ethereum mainnet

  const enable = useCallback(() => {
    setIsEnabled(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, []);

  const disable = useCallback(() => {
    setIsEnabled(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "false");
    }
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const newValue = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, String(newValue));
      }
      return newValue;
    });
  }, []);

  const setChain = useCallback((newChainId: number) => {
    setChainId(newChainId);
  }, []);

  const getAddress = useCallback((chainType: keyof MockAddresses): string => {
    return MOCK_ADDRESSES[chainType];
  }, []);

  // Memoize the return object
  return useMemo(
    () => ({
      isEnabled,
      address: MOCK_ADDRESSES.evm, // Default to EVM
      chainId,
      canSign: false, // Mock wallet cannot sign - always false
      enable,
      disable,
      toggle,
      setChain,
      getAddress,
    }),
    [isEnabled, chainId, enable, disable, toggle, setChain, getAddress],
  );
}

// ─────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────

/**
 * Get mock address for a chain type
 */
export function getMockAddress(chainType: keyof MockAddresses): string {
  return MOCK_ADDRESSES[chainType];
}

/**
 * Check if a step requires a real wallet
 */
export function requiresRealWallet(stepLabel: string): boolean {
  const lower = stepLabel.toLowerCase();
  return (
    lower.includes("authorize") ||
    lower.includes("sign") ||
    lower.includes("execute")
  );
}
