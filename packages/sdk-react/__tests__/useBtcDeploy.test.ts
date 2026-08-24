import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBtcDeploy } from '../src/hooks/useBtcDeploy';

vi.mock('@lombard.finance/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lombard.finance/sdk')>();
  return { ...actual };
});

import {
  AssetId,
  BtcActionStatus,
  Chain,
  DeployProtocol,
} from '@lombard.finance/sdk';

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
    authorizeDeposit: vi.fn(),
    generateDepositAddress: vi.fn(),
  };

  return action;
}

const deployParams = {
  amount: '0.01',
  destChain: Chain.ETHEREUM_MAINNET,
  sourceChain: Chain.BITCOIN_SIGNET,
  protocol: DeployProtocol.VEDA,
  recipient: '0xrecipient',
};

describe('useBtcDeploy', () => {
  let mockAction: ReturnType<typeof createMockAction>;
  let mockSdk: { chain: { btc: { deploy: ReturnType<typeof vi.fn> } } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAction = createMockAction();
    mockAction.prepare.mockResolvedValue(undefined);
    mockAction.authorizeDeposit.mockResolvedValue(undefined);
    mockAction.generateDepositAddress.mockResolvedValue('bc1q_snb_address');

    mockSdk = {
      chain: {
        btc: {
          deploy: vi.fn().mockReturnValue(mockAction),
        },
      },
    };
  });

  it('returns idle state when sdk is null', () => {
    const { result } = renderHook(() => useBtcDeploy(null));

    expect(result.current.status.phase).toBe('idle');
    expect(result.current.depositAddress).toBeNull();
    expect(result.current.depositAmount).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('throws when called with null sdk', async () => {
    const { result } = renderHook(() => useBtcDeploy(null));

    await expect(
      result.current.deploy(deployParams),
    ).rejects.toThrow('SDK not initialized');
  });

  it('calls SDK methods in correct order and sets depositAddress', async () => {
    mockAction.status = BtcActionStatus.READY;

    const { result } = renderHook(() => useBtcDeploy(mockSdk as never));

    await act(async () => {
      await result.current.deploy(deployParams);
    });

    expect(mockSdk.chain.btc.deploy).toHaveBeenCalledWith({
      assetOut: AssetId.LBTC,
      destChain: deployParams.destChain,
      sourceChain: deployParams.sourceChain,
      protocol: deployParams.protocol,
    });
    expect(mockAction.prepare).toHaveBeenCalledWith({
      amount: deployParams.amount,
      recipient: deployParams.recipient,
    });
    expect(mockAction.generateDepositAddress).toHaveBeenCalled();
    expect(result.current.depositAddress).toBe('bc1q_snb_address');
    expect(result.current.depositAmount).toBe('0.01');
    expect(result.current.status.phase).toBe('waiting-deposit');
    expect(result.current.isLoading).toBe(false);
  });

  it('calls authorizeDeposit when status is NEEDS_DEPLOY_AUTHORIZATION', async () => {
    mockAction.prepare.mockImplementation(() => {
      mockAction.status = BtcActionStatus.NEEDS_DEPLOY_AUTHORIZATION;
      return Promise.resolve(undefined);
    });
    mockAction.authorizeDeposit.mockImplementation(() => {
      mockAction.status = BtcActionStatus.READY;
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useBtcDeploy(mockSdk as never));

    await act(async () => {
      await result.current.deploy(deployParams);
    });

    expect(mockAction.authorizeDeposit).toHaveBeenCalled();
    expect(result.current.depositAddress).toBe('bc1q_snb_address');
  });

  it('sets error on failure and reset clears state', async () => {
    mockAction.prepare.mockRejectedValue(new Error('Authorization failed'));

    const { result } = renderHook(() => useBtcDeploy(mockSdk as never));

    await act(async () => {
      await result.current.deploy(deployParams).catch(() => {});
    });

    expect(result.current.error).toBe('Authorization failed');
    expect(result.current.status.phase).toBe('error');
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.status.phase).toBe('idle');
    expect(result.current.depositAddress).toBeNull();
    expect(result.current.depositAmount).toBeNull();
  });

  it('unsubscribes previous listeners when deploy is called again', async () => {
    mockAction.status = BtcActionStatus.READY;

    const { result } = renderHook(() => useBtcDeploy(mockSdk as never));

    await act(async () => {
      await result.current.deploy(deployParams);
    });

    const firstCallOnCount = mockAction.on.mock.calls.length;

    // Second call should clean up previous listeners first
    mockAction.status = BtcActionStatus.READY;
    mockAction.generateDepositAddress.mockResolvedValue('bc1q_second_address');

    await act(async () => {
      await result.current.deploy(deployParams);
    });

    // on() called twice per call (status-change + progress)
    expect(mockAction.on).toHaveBeenCalledTimes(firstCallOnCount * 2);
    expect(result.current.depositAddress).toBe('bc1q_second_address');
  });
});
