import { renderHook } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks (using vi.hoisted to avoid hoisting issues)
// ---------------------------------------------------------------------------

const {
  mockCreateConfig,
  mockSolanaModule,
  mockStake,
  mockReset,
  capturedConfigFactory,
} = vi.hoisted(() => ({
  mockCreateConfig: vi.fn(),
  mockSolanaModule: vi.fn().mockReturnValue("solana-module"),
  mockStake: vi.fn(),
  mockReset: vi.fn(),
  capturedConfigFactory: { current: null as (() => unknown) | null },
}));

const defaultStakeReturn = {
  stake: mockStake,
  reset: mockReset,
  depositAddress: null as string | null,
  stakeAmount: null as string | null,
  status: { phase: "idle", message: "" },
  progress: null,
  error: null as string | null,
  isLoading: false,
};

vi.mock("@lombard.finance/sdk", () => ({
  createConfig: mockCreateConfig,
  Chain: {
    BITCOIN_MAINNET: "bitcoin-mainnet",
    BITCOIN_SIGNET: "bitcoin-signet",
    SOLANA_MAINNET: "solana-mainnet",
  },
  Env: { prod: "prod", stage: "stage", testnet: "testnet" },
}));

vi.mock("@lombard.finance/sdk-solana", () => ({
  solanaModule: mockSolanaModule,
}));

vi.mock("@lombard.finance/sdk-react", () => ({
  useLombardSDK: vi.fn((factory: () => unknown) => {
    capturedConfigFactory.current = factory;
    return { sdk: null, isInitializing: false, error: null };
  }),
  useBtcStake: vi.fn(() => defaultStakeReturn),
}));

vi.mock("../../../lib/config", () => ({
  getEnvironment: vi.fn(() => "stage"),
}));

import { Env } from "@lombard.finance/sdk";
import { useLombardSDK, useBtcStake } from "@lombard.finance/sdk-react";
import { useBtcStakingSolana } from "../useBtcStakingSolana";

describe("useBtcStakingSolana", () => {
  const mockSolana = { isPhantom: true };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedConfigFactory.current = null;
    defaultStakeReturn.stake = mockStake;
    defaultStakeReturn.reset = mockReset;
    defaultStakeReturn.depositAddress = null;
    defaultStakeReturn.stakeAmount = null;
    defaultStakeReturn.status = { phase: "idle", message: "" };
    defaultStakeReturn.error = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns undefined config when window.solana is not present", () => {
    const { unmount } = renderHook(() => useBtcStakingSolana());

    expect(capturedConfigFactory.current).toBeTruthy();
    const config = capturedConfigFactory.current!();
    expect(config).toBeUndefined();
    expect(mockCreateConfig).not.toHaveBeenCalled();

    unmount();
  });

  it("creates SDK config with solana provider when window.solana exists", () => {
    vi.stubGlobal("solana", mockSolana);
    mockCreateConfig.mockReturnValue("mock-config");

    const { unmount } = renderHook(() => useBtcStakingSolana());

    expect(capturedConfigFactory.current).toBeTruthy();
    capturedConfigFactory.current!();

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        env: "stage",
        providers: { solana: expect.any(Function) },
        modules: ["solana-module"],
      }),
    );

    const callArgs = mockCreateConfig.mock.calls[0][0];
    expect(callArgs.providers.solana()).toBe(mockSolana);

    unmount();
  });

  it("includes solanaModule in config modules", () => {
    vi.stubGlobal("solana", mockSolana);
    mockCreateConfig.mockReturnValue("mock-config");

    const { unmount } = renderHook(() => useBtcStakingSolana());
    capturedConfigFactory.current!();

    expect(mockSolanaModule).toHaveBeenCalled();
    const callArgs = mockCreateConfig.mock.calls[0][0];
    expect(callArgs.modules).toEqual(["solana-module"]);

    unmount();
  });

  it("passes partnerId to config when provided", () => {
    vi.stubGlobal("solana", mockSolana);
    mockCreateConfig.mockReturnValue("mock-config");

    const { unmount } = renderHook(() => useBtcStakingSolana("partner-123"));
    capturedConfigFactory.current!();

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: { partnerId: "partner-123" },
      }),
    );

    unmount();
  });

  it("does not include partner when partnerId is not provided", () => {
    vi.stubGlobal("solana", mockSolana);
    mockCreateConfig.mockReturnValue("mock-config");

    const { unmount } = renderHook(() => useBtcStakingSolana());
    capturedConfigFactory.current!();

    const callArgs = mockCreateConfig.mock.calls[0][0];
    expect(callArgs.partner).toBeUndefined();

    unmount();
  });

  it("uses BITCOIN_MAINNET as sourceChain for prod env", () => {
    vi.stubGlobal("solana", mockSolana);

    const mockSdk = { chain: {} };
    vi.mocked(useLombardSDK).mockReturnValue({
      sdk: mockSdk as never,
      isInitializing: false,
      error: null,
    });

    const { result, unmount } = renderHook(() =>
      useBtcStakingSolana(undefined, Env.prod),
    );

    result.current.stake({
      amount: "0.5",
      destChain: "solana-mainnet" as never,
      destAddress: "solana-recipient",
      assetOut: "lbtc" as never,
    });

    expect(mockStake).toHaveBeenCalledWith(
      expect.objectContaining({ sourceChain: "bitcoin-mainnet" }),
    );

    unmount();
  });

  it("uses BITCOIN_SIGNET as sourceChain for non-prod env", () => {
    vi.stubGlobal("solana", mockSolana);

    const mockSdk = { chain: {} };
    vi.mocked(useLombardSDK).mockReturnValue({
      sdk: mockSdk as never,
      isInitializing: false,
      error: null,
    });

    const { result, unmount } = renderHook(() =>
      useBtcStakingSolana(undefined, Env.stage),
    );

    result.current.stake({
      amount: "0.1",
      destChain: "solana-mainnet" as never,
      destAddress: "solana-recipient",
      assetOut: "lbtc" as never,
    });

    expect(mockStake).toHaveBeenCalledWith(
      expect.objectContaining({ sourceChain: "bitcoin-signet" }),
    );

    unmount();
  });

  it("passes sdk to useBtcStake", () => {
    vi.stubGlobal("solana", mockSolana);

    const mockSdk = { chain: {} };
    vi.mocked(useLombardSDK).mockReturnValue({
      sdk: mockSdk as never,
      isInitializing: false,
      error: null,
    });

    const { unmount } = renderHook(() => useBtcStakingSolana());

    expect(useBtcStake).toHaveBeenCalledWith(mockSdk);

    unmount();
  });
});
