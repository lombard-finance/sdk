import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBtcStake } from '../src/hooks/useBtcStake';

vi.mock('@lombard.finance/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lombard.finance/sdk')>();
  return { ...actual };
});

import { AssetId, BtcActionStatus, Chain } from '@lombard.finance/sdk';

function createMockAction(initialStatus: string = BtcActionStatus.IDLE) {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  let currentStatus = initialStatus;

  const action = {
    get status() {
      return currentStatus;
    },
    set status(s: string) {
      currentStatus = s;
    },
    depositAddress: null as string | null,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return () => {
        handlers[event] = handlers[event].filter((h) => h !== handler);
      };
    }),
    emit(event: string, ...args: unknown[]) {
      handlers[event]?.forEach((h) => h(...args));
    },
    prepare: vi.fn(),
    authorize: vi.fn(),
    generateDepositAddress: vi.fn(),
  };

  return action;
}

const stakeParams = {
  amount: '0.001',
  destChain: Chain.ETHEREUM_MAINNET,
  sourceChain: Chain.BITCOIN_SIGNET,
  assetOut: AssetId.LBTC,
  recipient: '0xrecipient',
};

describe('useBtcStake', () => {
  let mockAction: ReturnType<typeof createMockAction>;
  let mockSdk: { chain: { btc: { stake: ReturnType<typeof vi.fn> } } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAction = createMockAction();
    mockAction.prepare.mockResolvedValue(undefined);
    mockAction.authorize.mockResolvedValue(undefined);
    mockAction.generateDepositAddress.mockResolvedValue(undefined);

    mockSdk = {
      chain: {
        btc: {
          stake: vi.fn().mockReturnValue(mockAction),
        },
      },
    };
  });

  it('returns idle state when sdk is null', () => {
    const { result } = renderHook(() => useBtcStake(null));

    expect(result.current.status.phase).toBe('idle');
    expect(result.current.depositAddress).toBeNull();
    expect(result.current.stakeAmount).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('throws when called with null sdk', async () => {
    const { result } = renderHook(() => useBtcStake(null));

    await expect(result.current.stake(stakeParams)).rejects.toThrow(
      'SDK not initialized',
    );
  });

  it('calls SDK methods in correct order and sets depositAddress', async () => {
    mockAction.status = BtcActionStatus.READY;
    mockAction.generateDepositAddress.mockImplementation(() => {
      mockAction.depositAddress = 'bc1q_deposit_address';
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useBtcStake(mockSdk as never));

    await act(async () => {
      await result.current.stake(stakeParams);
    });

    expect(mockSdk.chain.btc.stake).toHaveBeenCalledWith({
      assetOut: stakeParams.assetOut,
      destChain: stakeParams.destChain,
      sourceChain: stakeParams.sourceChain,
    });
    expect(mockAction.prepare).toHaveBeenCalledWith({
      amount: stakeParams.amount,
      recipient: stakeParams.recipient,
    });
    expect(mockAction.generateDepositAddress).toHaveBeenCalled();
    expect(result.current.depositAddress).toBe('bc1q_deposit_address');
    expect(result.current.stakeAmount).toBe('0.001');
    expect(result.current.status.phase).toBe('waiting-deposit');
    expect(result.current.isLoading).toBe(false);
  });

  it('calls authorize when status is NEEDS_FEE_AUTHORIZATION', async () => {
    mockAction.prepare.mockImplementation(() => {
      mockAction.status = BtcActionStatus.NEEDS_FEE_AUTHORIZATION;
      return Promise.resolve(undefined);
    });
    mockAction.authorize.mockImplementation(() => {
      mockAction.status = BtcActionStatus.READY;
      return Promise.resolve(undefined);
    });
    mockAction.generateDepositAddress.mockImplementation(() => {
      mockAction.depositAddress = 'bc1q_auth_address';
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useBtcStake(mockSdk as never));

    await act(async () => {
      await result.current.stake(stakeParams);
    });

    expect(mockAction.authorize).toHaveBeenCalled();
    expect(result.current.depositAddress).toBe('bc1q_auth_address');
  });

  it('uses depositAddress directly when status is ADDRESS_READY', async () => {
    mockAction.prepare.mockImplementation(() => {
      mockAction.status = BtcActionStatus.ADDRESS_READY;
      mockAction.depositAddress = 'bc1q_ready_address';
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useBtcStake(mockSdk as never));

    await act(async () => {
      await result.current.stake(stakeParams);
    });

    expect(mockAction.generateDepositAddress).not.toHaveBeenCalled();
    expect(result.current.depositAddress).toBe('bc1q_ready_address');
    expect(result.current.status.phase).toBe('waiting-deposit');
  });

  it('sets error on failure and reset clears state', async () => {
    mockAction.prepare.mockRejectedValue(new Error('Prepare failed'));

    const { result } = renderHook(() => useBtcStake(mockSdk as never));

    await act(async () => {
      await result.current.stake(stakeParams).catch(() => {});
    });

    expect(result.current.error).toBe('Prepare failed');
    expect(result.current.status.phase).toBe('error');
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.status.phase).toBe('idle');
    expect(result.current.depositAddress).toBeNull();
    expect(result.current.stakeAmount).toBeNull();
  });

  it('emits status-change events that update status', async () => {
    mockAction.status = BtcActionStatus.READY;
    mockAction.prepare.mockImplementation(() => {
      mockAction.emit('status-change', BtcActionStatus.READY);
      return Promise.resolve(undefined);
    });
    mockAction.generateDepositAddress.mockImplementation(() => {
      mockAction.depositAddress = 'bc1q_address';
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useBtcStake(mockSdk as never));

    await act(async () => {
      await result.current.stake(stakeParams);
    });

    expect(mockAction.on).toHaveBeenCalledWith(
      'status-change',
      expect.any(Function),
    );
    expect(mockAction.on).toHaveBeenCalledWith(
      'progress',
      expect.any(Function),
    );
  });
});
