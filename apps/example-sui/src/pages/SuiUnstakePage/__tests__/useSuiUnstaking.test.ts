import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateConfig,
  mockSuiModule,
  mockGetEnvironment,
  mockUseNonEvmUnstakeReturn,
  mockUseNonEvmUnstake,
  mockUseLombardSDK,
} = vi.hoisted(() => {
  const mockCreateConfig = vi.fn();
  const mockSuiModule = vi.fn().mockReturnValue('sui-module');
  const mockGetEnvironment = vi.fn().mockReturnValue('stage');

  const mockUnstake = vi.fn();
  const mockReset = vi.fn();
  const mockUseNonEvmUnstakeReturn = {
    unstake: mockUnstake,
    reset: mockReset,
    txHash: null,
    status: { phase: 'idle', message: '' },
    error: null,
  };
  const mockUseNonEvmUnstake = vi.fn().mockReturnValue(mockUseNonEvmUnstakeReturn);

  const mockUseLombardSDK = vi.fn().mockImplementation(() => {
    return { sdk: null, isInitializing: false, error: null };
  });

  return {
    mockCreateConfig,
    mockSuiModule,
    mockGetEnvironment,
    mockUnstake,
    mockReset,
    mockUseNonEvmUnstakeReturn,
    mockUseNonEvmUnstake,
    mockUseLombardSDK,
  };
});

let capturedConfigFactory: (() => unknown) | undefined;

vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
  };
});

vi.mock('@lombard.finance/sdk', () => ({
  createConfig: mockCreateConfig,
  Env: {
    prod: 'prod',
    testnet: 'testnet',
    stage: 'stage',
  },
}));

vi.mock('@lombard.finance/sdk-sui', () => ({
  suiModule: mockSuiModule,
}));

vi.mock('@lombard.finance/sdk-react', () => ({
  useNonEvmUnstake: mockUseNonEvmUnstake,
  useLombardSDK: mockUseLombardSDK,
}));

vi.mock('../../../lib/config', () => ({
  getEnvironment: mockGetEnvironment,
}));

import type { Chain } from '@lombard.finance/sdk';

import { useSuiUnstaking } from '../useSuiUnstaking';

describe('useSuiUnstaking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedConfigFactory = undefined;
    mockGetEnvironment.mockReturnValue('stage');
    mockUseNonEvmUnstake.mockReturnValue(mockUseNonEvmUnstakeReturn);
    mockUseLombardSDK.mockImplementation((factory: () => unknown) => {
      capturedConfigFactory = factory;
      return { sdk: null, isInitializing: false, error: null };
    });
  });

  it('returns undefined config when no suiAddress', () => {
    useSuiUnstaking(undefined);

    expect(capturedConfigFactory).toBeDefined();
    const config = capturedConfigFactory!();
    expect(config).toBeUndefined();
    expect(mockCreateConfig).not.toHaveBeenCalled();
  });

  it('creates config with sui provider when address, wallet, and walletAccount exist', () => {
    const mockWallet = { name: 'sui-wallet' };
    const mockAccount = { address: '0xabc' };

    useSuiUnstaking('0xsuiaddress', undefined, mockWallet, mockAccount);

    expect(capturedConfigFactory).toBeDefined();
    capturedConfigFactory!();

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'stage',
        providers: expect.objectContaining({
          sui: expect.any(Function),
        }),
        modules: ['sui-module'],
      }),
    );

    // Verify sui provider shape
    const call = mockCreateConfig.mock.calls[0][0];
    const suiProvider = call.providers.sui();
    expect(suiProvider.getWallet()).toBe(mockWallet);
    expect(suiProvider.getWalletAccount()).toBe(mockAccount);
  });

  it('uses useNonEvmUnstake with sui chain identifier', () => {
    useSuiUnstaking('0xsuiaddress');

    expect(mockUseNonEvmUnstake).toHaveBeenCalledWith(null, 'sui');
  });

  it('delegates unstake correctly', () => {
    const mockUnstakeFn = vi.fn();
    mockUseNonEvmUnstake.mockReturnValue({
      ...mockUseNonEvmUnstakeReturn,
      unstake: mockUnstakeFn,
    });

    const result = useSuiUnstaking('0xsuiaddress');

    const formData = {
      amount: '0.001',
      assetIn: 'lbtc' as never,
      assetOut: 'btc' as never,
      sourceChain: 'sui-mainnet' as Chain,
      destChain: 'bitcoin-mainnet' as Chain,
      recipient: 'bc1q_btc_address',
    };

    result.unstake(formData);

    expect(mockUnstakeFn).toHaveBeenCalledWith({
      amount: '0.001',
      sourceChain: 'sui-mainnet',
      destChain: 'bitcoin-mainnet',
      recipient: 'bc1q_btc_address',
    });
  });

  it('creates config without providers when wallet or walletAccount is missing', () => {
    useSuiUnstaking('0xsuiaddress', undefined, undefined, undefined);

    expect(capturedConfigFactory).toBeDefined();
    capturedConfigFactory!();

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'stage',
        modules: ['sui-module'],
      }),
    );

    const call = mockCreateConfig.mock.calls[0][0];
    expect(call.providers).toBeUndefined();
  });

  it('combines sdkError and unstakeError correctly', () => {
    mockUseLombardSDK.mockImplementation((factory: () => unknown) => {
      capturedConfigFactory = factory;
      return { sdk: null, isInitializing: false, error: null };
    });
    mockUseNonEvmUnstake.mockReturnValue({
      ...mockUseNonEvmUnstakeReturn,
      error: 'unstake-error',
    });

    const result = useSuiUnstaking('0xsuiaddress');
    expect(result.error).toBe('unstake-error');
  });
});
