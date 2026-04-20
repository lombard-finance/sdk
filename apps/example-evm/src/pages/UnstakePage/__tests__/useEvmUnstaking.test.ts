import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateConfig, mockUseEvmUnstake, mockUseLombardSDK, mockSwitchNetwork } = vi.hoisted(
  () => ({
    mockCreateConfig: vi.fn().mockReturnValue({ env: 'stage', providers: {} }),
    mockUseEvmUnstake: vi.fn(),
    mockUseLombardSDK: vi.fn(),
    mockSwitchNetwork: vi.fn().mockResolvedValue(undefined),
  }),
);

vi.mock('@lombard.finance/sdk', () => ({
  createConfig: mockCreateConfig,
  AssetId: {
    LBTC: 'LBTC',
    BTC: 'BTC',
  },
  Chain: {
    BITCOIN_MAINNET: 'bitcoin-mainnet',
    BITCOIN_SIGNET: 'bitcoin-signet',
    ETHEREUM_MAINNET: 'ethereum-mainnet',
  },
  Env: {
    prod: 'prod',
    testnet: 'testnet',
    stage: 'stage',
  },
}));

vi.mock('@lombard.finance/sdk-react', () => ({
  useEvmUnstake: mockUseEvmUnstake,
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
    unstake: vi.fn(),
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

  it('uses useEvmUnstake hook', () => {
    renderHook(() => useEvmUnstaking('0xAddress'));

    expect(mockUseEvmUnstake).toHaveBeenCalledWith({ mock: 'sdk' });
  });

  it('delegates unstake correctly and switches network first', async () => {
    const mockUnstakeFn = vi.fn();
    mockUseEvmUnstake.mockReturnValue({
      ...defaultUnstakeReturn,
      unstake: mockUnstakeFn,
    });

    const { result } = renderHook(() => useEvmUnstaking('0xAddress'));

    const formData: UnstakingFormData = {
      amount: '0.5',
      sourceChain: Chain.ETHEREUM_MAINNET as Chain,
      destChain: Chain.BITCOIN_MAINNET as Chain,
      recipient: 'bc1q_btc_address',
      assetOut: 'BTC' as never,
    };

    await result.current.unstake(formData);

    expect(mockSwitchNetwork).toHaveBeenCalledWith(Chain.ETHEREUM_MAINNET);
    expect(mockUnstakeFn).toHaveBeenCalledWith({
      amount: '0.5',
      sourceChain: Chain.ETHEREUM_MAINNET,
      destChain: Chain.BITCOIN_MAINNET,
      recipient: 'bc1q_btc_address',
      assetOut: 'BTC',
    });
  });
});
