import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateConfig, mockUseBtcStake, mockUseLombardSDK } = vi.hoisted(
  () => ({
    mockCreateConfig: vi.fn().mockReturnValue({ env: 'stage', providers: {} }),
    mockUseBtcStake: vi.fn(),
    mockUseLombardSDK: vi.fn(),
  }),
);

vi.mock('@lombard.finance/sdk', () => ({
  createConfig: mockCreateConfig,
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
  useBtcStake: mockUseBtcStake,
  useLombardSDK: mockUseLombardSDK,
}));

vi.mock('../../../lib/config', () => ({
  getEnvironment: () => 'stage',
}));

import { Chain, Env } from '@lombard.finance/sdk';

import { useBtcStakingEvm } from '../useBtcStakingEvm';

describe('useBtcStakingEvm', () => {
  let capturedConfigFn: () => unknown;

  const defaultStakeReturn = {
    stake: vi.fn(),
    reset: vi.fn(),
    depositAddress: null,
    stakeAmount: null,
    status: { phase: 'idle', message: 'Ready' },
    progress: {},
    error: null,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseBtcStake.mockReturnValue(defaultStakeReturn);
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

  it('creates SDK config without evm provider when window.ethereum is not present', () => {
    renderHook(() => useBtcStakingEvm());

    expect(capturedConfigFn).toBeDefined();
    capturedConfigFn();

    expect(mockCreateConfig).toHaveBeenCalledWith({
      env: 'stage',
      providers: {},
    });
  });

  it('creates SDK config with evm provider when window.ethereum exists', () => {
    const fakeProvider = { request: vi.fn() };
    Object.defineProperty(window, 'ethereum', {
      value: fakeProvider,
      writable: true,
      configurable: true,
    });

    renderHook(() => useBtcStakingEvm());

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

  it('passes partnerId to config when provided', () => {
    renderHook(() => useBtcStakingEvm('my-partner-id'));

    expect(capturedConfigFn).toBeDefined();
    capturedConfigFn();

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: { partnerId: 'my-partner-id' },
      }),
    );
  });

  it('delegates stake call correctly with proper chain mapping (prod -> BITCOIN_MAINNET)', () => {
    const mockStakeFn = vi.fn();
    mockUseBtcStake.mockReturnValue({
      ...defaultStakeReturn,
      stake: mockStakeFn,
    });

    const { result } = renderHook(() => useBtcStakingEvm(undefined, Env.prod));

    result.current.stake({
      amount: '0.5',
      destChain: Chain.ETHEREUM_MAINNET as Chain,
      destAddress: '0xRecipient',
      assetOut: 'LBTC' as never,
    });

    expect(mockStakeFn).toHaveBeenCalledWith({
      amount: '0.5',
      destChain: Chain.ETHEREUM_MAINNET,
      sourceChain: Chain.BITCOIN_MAINNET,
      assetOut: 'LBTC',
      recipient: '0xRecipient',
    });
  });

  it('delegates stake call correctly with proper chain mapping (non-prod -> BITCOIN_SIGNET)', () => {
    const mockStakeFn = vi.fn();
    mockUseBtcStake.mockReturnValue({
      ...defaultStakeReturn,
      stake: mockStakeFn,
    });

    const { result } = renderHook(() =>
      useBtcStakingEvm(undefined, Env.stage),
    );

    result.current.stake({
      amount: '0.1',
      destChain: Chain.ETHEREUM_MAINNET as Chain,
      destAddress: '0xRecipient',
      assetOut: 'LBTC' as never,
    });

    expect(mockStakeFn).toHaveBeenCalledWith({
      amount: '0.1',
      destChain: Chain.ETHEREUM_MAINNET,
      sourceChain: Chain.BITCOIN_SIGNET,
      assetOut: 'LBTC',
      recipient: '0xRecipient',
    });
  });
});
