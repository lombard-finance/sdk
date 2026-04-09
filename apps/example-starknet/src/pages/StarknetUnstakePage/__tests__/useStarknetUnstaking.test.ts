import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateConfig = vi.fn().mockReturnValue({ __config: true });
vi.mock("@lombard.finance/sdk", () => ({
  createConfig: (...args: unknown[]) => mockCreateConfig(...args),
  Env: { prod: "prod", testnet: "testnet", stage: "stage" },
}));

const mockGetRpcProvider = vi.fn().mockReturnValue({ __rpc: true });
const mockStarknetModule = vi.fn().mockReturnValue({ __module: true });
vi.mock("@lombard.finance/sdk-starknet", () => ({
  getRpcProvider: (...args: unknown[]) => mockGetRpcProvider(...args),
  StarknetChainId: { SN_MAIN: "SN_MAIN", SN_SEPOLIA: "SN_SEPOLIA" },
  starknetModule: (...args: unknown[]) => mockStarknetModule(...args),
}));

// Capture the config factory so we can call it in tests
let capturedConfigFn: (() => unknown) | null = null;

const mockUseLombardSDK = vi
  .fn()
  .mockImplementation((configFn: () => unknown) => {
    capturedConfigFn = configFn;
    return { sdk: null, isInitializing: false, error: null };
  });

const mockUnstake = vi.fn();
const mockReset = vi.fn();
const defaultUnstakeReturn = {
  unstake: mockUnstake,
  reset: mockReset,
  txHash: null,
  status: { phase: "idle", message: "Ready to unstake" },
  error: null,
  isLoading: false,
};
const mockUseNonEvmUnstake = vi.fn().mockReturnValue(defaultUnstakeReturn);

vi.mock("@lombard.finance/sdk-react", () => ({
  useLombardSDK: (...args: unknown[]) => mockUseLombardSDK(...args),
  useNonEvmUnstake: (...args: unknown[]) => mockUseNonEvmUnstake(...args),
}));

const mockWalletAccountConnect = vi.fn();
vi.mock("starknet", () => ({
  WalletAccount: {
    connect: (...args: unknown[]) => mockWalletAccountConnect(...args),
  },
}));

vi.mock("../../../lib/config", () => ({
  getEnvironment: () => "stage",
}));

// ---------------------------------------------------------------------------
// Import hook under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import { useStarknetUnstaking } from "../useStarknetUnstaking";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useStarknetUnstaking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedConfigFn = null;
    mockUseLombardSDK.mockImplementation((configFn: () => unknown) => {
      capturedConfigFn = configFn;
      return { sdk: null, isInitializing: false, error: null };
    });
    mockUseNonEvmUnstake.mockReturnValue({ ...defaultUnstakeReturn });
    mockWalletAccountConnect.mockResolvedValue({ __walletAccount: true });
  });

  it("returns idle state when no address", () => {
    const { result } = renderHook(() => useStarknetUnstaking(undefined));

    expect(result.current.status.phase).toBe("idle");
    expect(result.current.txHash).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("calls WalletAccount.connect on mount", async () => {
    const fakeProvider = { id: "braavos" };

    renderHook(() =>
      useStarknetUnstaking(
        "0xStarknetAddress",
        undefined,
        fakeProvider,
        "braavos",
      ),
    );

    await waitFor(() => {
      expect(mockWalletAccountConnect).toHaveBeenCalledWith(
        { __rpc: true },
        fakeProvider,
      );
    });
  });

  it("falls back to wrapped account when WalletAccount.connect fails", async () => {
    mockWalletAccountConnect.mockRejectedValue(new Error("connect failed"));

    const fakeProvider = {
      id: "braavos",
      name: "Braavos",
      account: { address: "0x123" },
    };

    renderHook(() =>
      useStarknetUnstaking(
        "0xStarknetAddress",
        undefined,
        fakeProvider,
        "braavos",
      ),
    );

    await waitFor(() => {
      expect(mockWalletAccountConnect).toHaveBeenCalled();
    });

    // After fallback, the config factory should produce a valid config
    await waitFor(() => {
      expect(capturedConfigFn).not.toBeNull();
      const config = capturedConfigFn!();
      expect(config).toBeDefined();
    });

    // Verify createConfig was called with a starknet provider
    const configCall = mockCreateConfig.mock.calls[0][0];
    const starknetProviderFn = configCall.providers.starknet;
    const providerResult = starknetProviderFn();
    const wrappedAccount = providerResult.getProvider();

    // The wrapped account should have walletProvider.name set
    expect(wrappedAccount.walletProvider).toBeDefined();
    expect(wrappedAccount.walletProvider.name).toBe("Braavos");
  });

  it("creates config with starknet module", async () => {
    const fakeProvider = { id: "argentX" };
    const fakeWalletAccount = { __walletAccount: true };
    mockWalletAccountConnect.mockResolvedValue(fakeWalletAccount);

    renderHook(() =>
      useStarknetUnstaking(
        "0xStarknetAddress",
        undefined,
        fakeProvider,
        "argentX",
      ),
    );

    await waitFor(() => {
      expect(mockWalletAccountConnect).toHaveBeenCalled();
    });

    // Wait for walletAccount state to settle, then invoke the config factory
    await waitFor(() => {
      expect(capturedConfigFn).not.toBeNull();
      const config = capturedConfigFn!();
      expect(config).toBeDefined();
    });

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        env: "stage",
        modules: [{ __module: true }],
        providers: expect.objectContaining({
          starknet: expect.any(Function),
        }),
      }),
    );

    // Verify the starknet provider returns the connected wallet account
    const configCall = mockCreateConfig.mock.calls[0][0];
    const starknetProviderFn = configCall.providers.starknet;
    expect(starknetProviderFn().getProvider()).toBe(fakeWalletAccount);
  });

  it("delegates unstake to useNonEvmUnstake with starknet namespace", async () => {
    const fakeSdk = { __sdk: true };
    mockUseLombardSDK.mockImplementation((configFn: () => unknown) => {
      capturedConfigFn = configFn;
      return { sdk: fakeSdk, isInitializing: false, error: null };
    });

    const unstakeReturn = {
      ...defaultUnstakeReturn,
      status: { phase: "complete", message: "Unstake complete!" },
      txHash: "starknet_tx_hash",
    };
    mockUseNonEvmUnstake.mockReturnValue(unstakeReturn);

    const { result } = renderHook(() =>
      useStarknetUnstaking(
        "0xStarknetAddress",
        undefined,
        { id: "braavos" },
        "braavos",
      ),
    );

    // useNonEvmUnstake should have been called with sdk and 'starknet'
    expect(mockUseNonEvmUnstake).toHaveBeenCalledWith(fakeSdk, "starknet");

    // The hook should forward useNonEvmUnstake's return values
    expect(result.current.txHash).toBe("starknet_tx_hash");
    expect(result.current.status.phase).toBe("complete");

    // Call unstake and verify delegation
    await act(async () => {
      await result.current.unstake({
        amount: "0.01",
        assetIn: "LBTC" as never,
        assetOut: "BTC" as never,
        sourceChain: "starknet-mainnet" as never,
        destChain: "bitcoin-mainnet" as never,
        recipient: "bc1q_btc_address",
      });
    });

    expect(mockUnstake).toHaveBeenCalledWith({
      amount: "0.01",
      sourceChain: "starknet-mainnet",
      destChain: "bitcoin-mainnet",
      recipient: "bc1q_btc_address",
    });
  });
});
