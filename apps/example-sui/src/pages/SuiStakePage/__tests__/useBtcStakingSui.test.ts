import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Chain, Env } from '@lombard.finance/sdk';

const {
  mockCreateConfig,
  mockSuiModule,
  mockGetEnvironment,
  mockUseBtcStakeReturn,
  mockUseBtcStake,
  mockUseLombardSDK,
} = vi.hoisted(() => {
  const mockCreateConfig = vi.fn();
  const mockSuiModule = vi.fn().mockReturnValue('sui-module');
  const mockGetEnvironment = vi.fn().mockReturnValue('stage');

  const mockStake = vi.fn();
  const mockReset = vi.fn();
  const mockUseBtcStakeReturn = {
    stake: mockStake,
    reset: mockReset,
    depositAddress: null,
    stakeAmount: null,
    status: { phase: 'idle', message: '' },
    progress: null,
    error: null,
  };
  const mockUseBtcStake = vi.fn().mockReturnValue(mockUseBtcStakeReturn);

  const mockUseLombardSDK = vi.fn().mockImplementation(() => {
    return { sdk: null, isInitializing: false, error: null };
  });

  return {
    mockCreateConfig,
    mockSuiModule,
    mockGetEnvironment,
    mockStake,
    mockReset,
    mockUseBtcStakeReturn,
    mockUseBtcStake,
    mockUseLombardSDK,
  };
});

let capturedConfigFactory: (() => unknown) | undefined;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useCallback: (fn: unknown) => fn,
  };
});

vi.mock('@lombard.finance/sdk', () => ({
  createConfig: mockCreateConfig,
  Chain: {
    BITCOIN_MAINNET: 'bitcoin-mainnet',
    BITCOIN_SIGNET: 'bitcoin-signet',
  },
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
  useBtcStake: mockUseBtcStake,
  useLombardSDK: mockUseLombardSDK,
}));

vi.mock('../../../lib/config', () => ({
  getEnvironment: mockGetEnvironment,
}));

import { useBtcStakingSui } from '../useBtcStakingSui';

describe('useBtcStakingSui', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedConfigFactory = undefined;
    mockGetEnvironment.mockReturnValue('stage');
    mockUseBtcStake.mockReturnValue(mockUseBtcStakeReturn);
    mockUseLombardSDK.mockImplementation((factory: () => unknown) => {
      capturedConfigFactory = factory;
      return { sdk: null, isInitializing: false, error: null };
    });
  });

  it('returns idle state when no suiWallet provided', () => {
    const result = useBtcStakingSui(undefined, undefined);

    expect(result.status).toEqual({ phase: 'idle', message: '' });
    expect(result.depositAddress).toBeNull();
    expect(result.stakeAmount).toBeNull();
    expect(result.error).toBeNull();

    // Config factory should return undefined when no wallet
    expect(capturedConfigFactory).toBeDefined();
    const config = capturedConfigFactory!();
    expect(config).toBeUndefined();
    expect(mockCreateConfig).not.toHaveBeenCalled();
  });

  it('creates SDK config with sui provider when both wallet and walletAccount exist', () => {
    const mockWallet = { name: 'sui-wallet' };
    const mockAccount = { address: '0xabc' };

    useBtcStakingSui(mockWallet, mockAccount);

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
  });

  it('sui provider has getWallet and getWalletAccount methods', () => {
    const mockWallet = { name: 'sui-wallet' };
    const mockAccount = { address: '0xabc' };

    useBtcStakingSui(mockWallet, mockAccount);

    expect(capturedConfigFactory).toBeDefined();
    capturedConfigFactory!();

    const call = mockCreateConfig.mock.calls[0][0];
    const suiProvider = call.providers.sui();

    expect(suiProvider.getWallet()).toBe(mockWallet);
    expect(suiProvider.getWalletAccount()).toBe(mockAccount);
  });

  it('includes suiModule in config modules', () => {
    const mockWallet = { name: 'sui-wallet' };
    const mockAccount = { address: '0xabc' };

    useBtcStakingSui(mockWallet, mockAccount);

    expect(capturedConfigFactory).toBeDefined();
    capturedConfigFactory!();

    expect(mockSuiModule).toHaveBeenCalled();
    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        modules: ['sui-module'],
      }),
    );
  });

  it('passes partnerId to config when provided', () => {
    const mockWallet = { name: 'sui-wallet' };
    const mockAccount = { address: '0xabc' };

    useBtcStakingSui(mockWallet, mockAccount, 'partner-123');

    expect(capturedConfigFactory).toBeDefined();
    capturedConfigFactory!();

    expect(mockCreateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: { partnerId: 'partner-123' },
      }),
    );
  });

  it('delegates stake call correctly with proper chain mapping', () => {
    const mockWallet = { name: 'sui-wallet' };
    const mockAccount = { address: '0xabc' };

    // Use testnet env (non-prod) so sourceChain = BITCOIN_SIGNET
    mockGetEnvironment.mockReturnValue('stage');

    const mockStakeFn = vi.fn();
    mockUseBtcStake.mockReturnValue({
      ...mockUseBtcStakeReturn,
      stake: mockStakeFn,
    });

    const result = useBtcStakingSui(mockWallet, mockAccount);

    const formData = {
      amount: '0.01',
      destChain: 'sui-mainnet' as Chain,
      destAddress: '0xrecipient',
      assetOut: 'lbtc' as never,
    };

    result.stake(formData);

    expect(mockStakeFn).toHaveBeenCalledWith({
      amount: '0.01',
      destChain: 'sui-mainnet',
      sourceChain: 'bitcoin-signet',
      assetOut: 'lbtc',
      recipient: '0xrecipient',
    });
  });

  it('uses BITCOIN_MAINNET as sourceChain when env is prod', () => {
    const mockWallet = { name: 'sui-wallet' };
    const mockAccount = { address: '0xabc' };

    const mockStakeFn = vi.fn();
    mockUseBtcStake.mockReturnValue({
      ...mockUseBtcStakeReturn,
      stake: mockStakeFn,
    });

    const result = useBtcStakingSui(
      mockWallet,
      mockAccount,
      undefined,
      'prod' as Env,
    );

    const formData = {
      amount: '0.01',
      destChain: 'sui-mainnet' as Chain,
      destAddress: '0xrecipient',
      assetOut: 'lbtc' as never,
    };

    result.stake(formData);

    expect(mockStakeFn).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceChain: 'bitcoin-mainnet',
      }),
    );
  });
});
