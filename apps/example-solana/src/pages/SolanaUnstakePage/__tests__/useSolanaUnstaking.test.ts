import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateConfig,
  mockSolanaModule,
  mockUnstake,
  mockReset,
  mockUseNonEvmUnstakeReturn,
  capturedConfigFactory,
} = vi.hoisted(() => {
  const mockUnstake = vi.fn();
  const mockReset = vi.fn();

  return {
    mockCreateConfig: vi.fn(),
    mockSolanaModule: vi.fn().mockReturnValue('solana-module'),
    mockUnstake,
    mockReset,
    mockUseNonEvmUnstakeReturn: {
      unstake: mockUnstake,
      reset: mockReset,
      txHash: null as string | null,
      status: { phase: 'idle', message: '' },
      error: null as string | null,
      isLoading: false,
    },
    capturedConfigFactory: { current: null as (() => unknown) | null },
  };
});

vi.mock('@lombard.finance/sdk', () => ({
  createConfig: mockCreateConfig,
  Chain: {
    BITCOIN_MAINNET: 'bitcoin-mainnet',
    BITCOIN_SIGNET: 'bitcoin-signet',
    SOLANA_MAINNET: 'solana-mainnet',
  },
  Env: {
    prod: 'prod',
    stage: 'stage',
    testnet: 'testnet',
  },
  AssetId: {
    LBTC: 'lbtc',
    BTC: 'btc',
  },
}));

vi.mock('@lombard.finance/sdk-solana', () => ({
  solanaModule: mockSolanaModule,
}));

vi.mock('@lombard.finance/sdk-react', () => ({
  useLombardSDK: vi.fn((factory: () => unknown) => {
    capturedConfigFactory.current = factory;
    return { sdk: null, isInitializing: false, error: null };
  }),
  useNonEvmUnstake: vi.fn(() => mockUseNonEvmUnstakeReturn),
}));

vi.mock('../../../lib/config', () => ({
  getEnvironment: vi.fn(() => 'stage'),
}));

import { Chain } from '@lombard.finance/sdk';
import { useLombardSDK, useNonEvmUnstake } from '@lombard.finance/sdk-react';
import { useSolanaUnstaking } from '../useSolanaUnstaking';

// Minimal renderHook using react-dom/client
function renderHook<T>(hookFn: () => T) {
  const result: { current: T } = { current: undefined as T };
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root;

  function HookWrapper() {
    result.current = hookFn();
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(React.createElement(HookWrapper));
  });

  return {
    result,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('useSolanaUnstaking', () => {
  const mockSolana = { isPhantom: true };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedConfigFactory.current = null;
    mockUseNonEvmUnstakeReturn.unstake = mockUnstake;
    mockUseNonEvmUnstakeReturn.reset = mockReset;
    mockUseNonEvmUnstakeReturn.txHash = null;
    mockUseNonEvmUnstakeReturn.status = { phase: 'idle', message: '' };
    mockUseNonEvmUnstakeReturn.error = null;
    mockUseNonEvmUnstakeReturn.isLoading = false;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns undefined config when no solanaAddress', () => {
    vi.stubGlobal('solana', mockSolana);

    const { unmount } = renderHook(() => useSolanaUnstaking());

    expect(capturedConfigFactory.current).toBeTruthy();
    const config = capturedConfigFactory.current!();
    expect(config).toBeUndefined();
    expect(mockCreateConfig).not.toHaveBeenCalled();

    unmount();
  });

  it('returns undefined config when solanaAddress is null', () => {
    vi.stubGlobal('solana', mockSolana);

    const { unmount } = renderHook(() => useSolanaUnstaking(null));

    expect(capturedConfigFactory.current).toBeTruthy();
    const config = capturedConfigFactory.current!();
    expect(config).toBeUndefined();
    expect(mockCreateConfig).not.toHaveBeenCalled();

    unmount();
  });

  it('creates config with solana provider when both address and window.solana exist', () => {
    vi.stubGlobal('solana', mockSolana);
    mockCreateConfig.mockReturnValue('mock-config');

    const { unmount } = renderHook(() =>
      useSolanaUnstaking('solana-address-123'),
    );

    expect(capturedConfigFactory.current).toBeTruthy();
    const config = capturedConfigFactory.current!();

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'stage',
        providers: { solana: expect.any(Function) },
        modules: ['solana-module'],
      }),
    );
    expect(config).toBe('mock-config');

    // Verify provider returns window.solana
    const callArgs = mockCreateConfig.mock.calls[0][0];
    expect(callArgs.providers.solana()).toBe(mockSolana);

    unmount();
  });

  it('creates config without solana provider when window.solana is absent', () => {
    mockCreateConfig.mockReturnValue('mock-config');

    const { unmount } = renderHook(() =>
      useSolanaUnstaking('solana-address-123'),
    );

    expect(capturedConfigFactory.current).toBeTruthy();
    capturedConfigFactory.current!();

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'stage',
        providers: {},
        modules: ['solana-module'],
      }),
    );

    unmount();
  });

  it('uses useNonEvmUnstake with solana chain identifier', () => {
    vi.stubGlobal('solana', mockSolana);

    const { unmount } = renderHook(() =>
      useSolanaUnstaking('solana-address-123'),
    );

    expect(useNonEvmUnstake).toHaveBeenCalledWith(null, 'solana');

    unmount();
  });

  it('delegates unstake correctly', () => {
    vi.stubGlobal('solana', mockSolana);

    const mockSdk = { chain: {} };
    vi.mocked(useLombardSDK).mockReturnValue({
      sdk: mockSdk as never,
      isInitializing: false,
      error: null,
    });

    const { result, unmount } = renderHook(() =>
      useSolanaUnstaking('solana-address-123'),
    );

    const formData = {
      amount: '0.5',
      sourceChain: Chain.SOLANA_MAINNET as never,
      destChain: Chain.BITCOIN_MAINNET as never,
      recipient: 'bc1q_btc_address',
      assetOut: 'btc' as never,
    };

    result.current.unstake(formData);

    expect(mockUnstake).toHaveBeenCalledWith({
      amount: '0.5',
      sourceChain: 'solana-mainnet',
      destChain: 'bitcoin-mainnet',
      recipient: 'bc1q_btc_address',
    });

    unmount();
  });

  it('passes sdk from useLombardSDK to useNonEvmUnstake', () => {
    vi.stubGlobal('solana', mockSolana);

    const mockSdk = { chain: {} };
    vi.mocked(useLombardSDK).mockReturnValue({
      sdk: mockSdk as never,
      isInitializing: false,
      error: null,
    });

    const { unmount } = renderHook(() =>
      useSolanaUnstaking('solana-address-123'),
    );

    expect(useNonEvmUnstake).toHaveBeenCalledWith(mockSdk, 'solana');

    unmount();
  });

  it('combines sdkError and unstakeError correctly', () => {
    vi.stubGlobal('solana', mockSolana);

    vi.mocked(useLombardSDK).mockReturnValue({
      sdk: null,
      isInitializing: false,
      error: 'sdk init failed' as never,
    });
    mockUseNonEvmUnstakeReturn.error = 'unstake failed';

    const { result, unmount } = renderHook(() =>
      useSolanaUnstaking('solana-address-123'),
    );

    expect(result.current.error).toBe('sdk init failed');

    unmount();
  });
});
