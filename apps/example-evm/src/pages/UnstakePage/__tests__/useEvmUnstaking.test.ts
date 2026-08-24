import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateConfig,
  mockUseEvmUnstake,
  mockUseLombardSDK,
  mockSwitchNetwork,
} = vi.hoisted(() => ({
  mockCreateConfig: vi.fn().mockReturnValue({ env: 'stage', providers: {} }),
  mockUseEvmUnstake: vi.fn(),
  mockUseLombardSDK: vi.fn(),
  mockSwitchNetwork: vi.fn().mockResolvedValue(undefined),
}));

// Extends the real module rather than replacing it. The previous factory
// invented a `Chain` map with values like 'ethereum-mainnet', which do not
// exist in the SDK — the real identifiers are CAIP-style — so these tests
// asserted against chain ids no code path ever produces.
vi.mock('@lombard.finance/sdk', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createConfig: mockCreateConfig,
}));

vi.mock('@lombard.finance/sdk-react', () => ({
  useEvmWithdraw: mockUseEvmUnstake,
  useLombardSDK: mockUseLombardSDK,
}));

vi.mock('../../../lib/config', () => ({
  getEnvironment: () => 'stage',
}));

vi.mock('../../../hooks/useEvmWallet', () => ({
  useEvmWallet: () => ({ switchNetwork: mockSwitchNetwork }),
}));

import { Chain } from '@lombard.finance/sdk';

import { useEvmUnstaking } from '../useEvmUnstaking';
import type { UnstakingFormData } from '../useEvmUnstaking';

describe('useEvmUnstaking', () => {
  let capturedConfigFn: () => unknown;

  const defaultUnstakeReturn = {
    withdraw: vi.fn(),
    reset: vi.fn(),
    txHash: null,
    status: { phase: 'idle', message: 'Ready' },
    error: null,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseEvmUnstake.mockReturnValue(defaultUnstakeReturn);
    mockUseLombardSDK.mockImplementation((configFn: () => unknown) => {
      capturedConfigFn = configFn;
      return { sdk: { mock: 'sdk' }, isInitializing: false, error: null };
    });
    mockCreateConfig.mockReturnValue({ env: 'stage', providers: {} });

    // Clean up window.ethereum between tests
    if ('ethereum' in window) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (window as unknown as Record<string, unknown>).ethereum;
    }
  });

  it('creates config with evm provider when window.ethereum exists', () => {
    const fakeProvider = { request: vi.fn() };
    Object.defineProperty(window, 'ethereum', {
      value: fakeProvider,
      writable: true,
      configurable: true,
    });

    renderHook(() => useEvmUnstaking('0xAddress'));

    expect(capturedConfigFn).toBeDefined();
    capturedConfigFn();

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'stage',
        providers: expect.objectContaining({
          evm: expect.any(Function),
        }),
      }),
    );

    // Verify the evm provider factory returns window.ethereum
    const callArgs = mockCreateConfig.mock.calls[0][0];
    expect(callArgs.providers.evm()).toBe(fakeProvider);
  });

  it('uses useEvmWithdraw hook', () => {
    renderHook(() => useEvmUnstaking('0xAddress'));

    expect(mockUseEvmUnstake).toHaveBeenCalledWith({ mock: 'sdk' });
  });

  it('delegates unstake correctly and switches network first', async () => {
    const mockUnstakeFn = vi.fn();
    mockUseEvmUnstake.mockReturnValue({
      ...defaultUnstakeReturn,
      withdraw: mockUnstakeFn,
    });

    const { result } = renderHook(() => useEvmUnstaking('0xAddress'));

    const formData: UnstakingFormData = {
      amount: '0.5',
      sourceChain: Chain.ETHEREUM as Chain,
      destChain: Chain.BITCOIN_MAINNET as Chain,
      recipient: 'bc1q_btc_address',
      assetOut: 'BTC' as never,
    };

    await result.current.unstake(formData);

    expect(mockSwitchNetwork).toHaveBeenCalledWith(Chain.ETHEREUM);
    expect(mockUnstakeFn).toHaveBeenCalledWith({
      amount: '0.5',
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.BITCOIN_MAINNET,
      recipient: 'bc1q_btc_address',
      assetOut: 'BTC',
    });
  });
});
