import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateConfig = vi.fn().mockReturnValue({ __config: true });
vi.mock('@lombard.finance/sdk', () => ({
  createConfig: (...args: unknown[]) => mockCreateConfig(...args),
  Env: { prod: 'prod', testnet: 'testnet', stage: 'stage' },
  Chain: {
    BITCOIN_MAINNET: 'bitcoin-mainnet',
    BITCOIN_SIGNET: 'bitcoin-signet',
  },
}));

const mockGetRpcProvider = vi.fn().mockReturnValue({ __rpc: true });
const mockStarknetModule = vi.fn().mockReturnValue({ __module: true });
vi.mock('@lombard.finance/sdk-starknet', () => ({
  getRpcProvider: (...args: unknown[]) => mockGetRpcProvider(...args),
  StarknetChainId: { SN_MAIN: 'SN_MAIN', SN_SEPOLIA: 'SN_SEPOLIA' },
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

const mockStake = vi.fn();
const mockReset = vi.fn();
const defaultStakeReturn = {
  stake: mockStake,
  reset: mockReset,
  depositAddress: null,
  stakeAmount: null,
  status: { phase: 'idle', message: 'Ready to stake' },
  progress: {},
  error: null,
  isLoading: false,
};
const mockUseBtcStake = vi.fn().mockReturnValue(defaultStakeReturn);

vi.mock('@lombard.finance/sdk-react', () => ({
  useLombardSDK: (...args: unknown[]) => mockUseLombardSDK(...args),
  useBtcStake: (...args: unknown[]) => mockUseBtcStake(...args),
}));

const mockWalletAccountConnect = vi.fn();
vi.mock('starknet', () => ({
  WalletAccount: {
    connect: (...args: unknown[]) => mockWalletAccountConnect(...args),
  },
}));

vi.mock('../../../lib/config', () => ({
  getEnvironment: () => 'stage',
}));

// ---------------------------------------------------------------------------
// Import hook under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import { useBtcStakingStarknet } from '../useBtcStakingStarknet';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBtcStakingStarknet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedConfigFn = null;
    mockUseLombardSDK.mockImplementation((configFn: () => unknown) => {
      capturedConfigFn = configFn;
      return { sdk: null, isInitializing: false, error: null };
    });
    mockUseBtcStake.mockReturnValue({ ...defaultStakeReturn });
    mockWalletAccountConnect.mockResolvedValue({ __walletAccount: true });
  });

  it('returns idle state when no provider', () => {
    const { result } = renderHook(() => useBtcStakingStarknet(undefined));

    expect(result.current.status.phase).toBe('idle');
    expect(result.current.depositAddress).toBeNull();
    expect(result.current.stakeAmount).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('calls WalletAccount.connect on mount when provider given', async () => {
    const fakeProvider = { id: 'braavos' };

    renderHook(() => useBtcStakingStarknet(fakeProvider));

    await waitFor(() => {
      expect(mockWalletAccountConnect).toHaveBeenCalledWith(
        { __rpc: true },
        fakeProvider,
      );
    });
  });

  it('falls back to wrapped account when WalletAccount.connect fails', async () => {
    mockWalletAccountConnect.mockRejectedValue(new Error('connect failed'));

    const fakeProvider = {
      id: 'braavos',
      name: 'Braavos',
      account: { address: '0x123' },
    };

    renderHook(() =>
      useBtcStakingStarknet(fakeProvider, undefined, undefined, 'braavos'),
    );

    await waitFor(() => {
      expect(mockWalletAccountConnect).toHaveBeenCalled();
    });

    // The hook should have fallen back to wrapping the provider's account.
    // Verify by calling the captured config factory, which uses walletAccount
    // internally via closure. The config factory returns undefined while
    // walletAccount is null, but after the fallback fires it should create a config.
    await waitFor(() => {
      expect(capturedConfigFn).not.toBeNull();
      const config = capturedConfigFn!();
      // Config should be defined since fallback set walletAccount
      expect(config).toBeDefined();
    });

    // Verify createConfig was called — the starknet provider function
    // should return an object with getProvider that returns the wrapped account
    const configCall = mockCreateConfig.mock.calls[0][0];
    const starknetProviderFn = configCall.providers.starknet;
    const providerResult = starknetProviderFn();
    const wrappedAccount = providerResult.getProvider();

    // The wrapped account should have walletProvider.name set
    expect(wrappedAccount.walletProvider).toBeDefined();
    expect(wrappedAccount.walletProvider.name).toBe('Braavos');
  });

  it('creates config with starknet module and provider', async () => {
    const fakeProvider = { id: 'argentX' };
    const fakeWalletAccount = { __walletAccount: true };
    mockWalletAccountConnect.mockResolvedValue(fakeWalletAccount);

    renderHook(() => useBtcStakingStarknet(fakeProvider));

    await waitFor(() => {
      expect(mockWalletAccountConnect).toHaveBeenCalled();
    });

    // Wait for the walletAccount state to settle, then invoke the config factory
    await waitFor(() => {
      expect(capturedConfigFn).not.toBeNull();
      const config = capturedConfigFn!();
      expect(config).toBeDefined();
    });

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'stage',
        modules: [{ __module: true }],
        providers: expect.objectContaining({
          starknet: expect.any(Function),
        }),
      }),
    );

    // Verify the starknet provider function returns the connected wallet account
    const configCall = mockCreateConfig.mock.calls[0][0];
    const starknetProviderFn = configCall.providers.starknet;
    expect(starknetProviderFn().getProvider()).toBe(fakeWalletAccount);
  });

  it('passes partnerId to config', async () => {
    const fakeProvider = { id: 'braavos' };
    mockWalletAccountConnect.mockResolvedValue({ __walletAccount: true });

    renderHook(() => useBtcStakingStarknet(fakeProvider, 'my-partner-id'));

    await waitFor(() => {
      expect(capturedConfigFn).not.toBeNull();
      const config = capturedConfigFn!();
      expect(config).toBeDefined();
    });

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: { partnerId: 'my-partner-id' },
      }),
    );
  });

  it('delegates stake call to useBtcStake', async () => {
    const fakeSdk = { __sdk: true };
    mockUseLombardSDK.mockImplementation((configFn: () => unknown) => {
      capturedConfigFn = configFn;
      return { sdk: fakeSdk, isInitializing: false, error: null };
    });

    const stakeReturn = {
      ...defaultStakeReturn,
      status: { phase: 'waiting-deposit', message: 'Send BTC' },
      depositAddress: 'bc1q_test',
      stakeAmount: '0.01',
    };
    mockUseBtcStake.mockReturnValue(stakeReturn);

    const { result } = renderHook(() =>
      useBtcStakingStarknet({ id: 'braavos' }),
    );

    // useBtcStake should have been called with the sdk from useLombardSDK
    expect(mockUseBtcStake).toHaveBeenCalledWith(fakeSdk);

    // The hook should forward useBtcStake's return values
    expect(result.current.depositAddress).toBe('bc1q_test');
    expect(result.current.stakeAmount).toBe('0.01');
    expect(result.current.status.phase).toBe('waiting-deposit');

    // Call stake and verify delegation
    await act(async () => {
      await result.current.stake({
        amount: '0.01',
        destChain: 'bitcoin-mainnet' as never,
        destAddress: '0xrecipient',
        assetOut: 'LBTC' as never,
      });
    });

    expect(mockStake).toHaveBeenCalledWith({
      amount: '0.01',
      destChain: 'bitcoin-mainnet',
      sourceChain: 'bitcoin-signet',
      assetOut: 'LBTC',
      recipient: '0xrecipient',
    });
  });
});
