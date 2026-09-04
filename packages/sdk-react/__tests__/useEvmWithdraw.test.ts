import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useEvmWithdraw } from '../src/hooks/useEvmWithdraw';

vi.mock('@lombard.finance/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lombard.finance/sdk')>();
  return { ...actual };
});

import { AssetId, Chain, EvmOperationStatus } from '@lombard.finance/sdk';

function createMockUnstakeAction(
  initialStatus: string = EvmOperationStatus.IDLE,
) {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  let currentStatus = initialStatus;

  return {
    get status() {
      return currentStatus;
    },
    set status(s: string) {
      currentStatus = s;
    },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return () => {
        handlers[event] = handlers[event].filter((h) => h !== handler);
      };
    }),
    prepare: vi.fn(),
    authorizeFee: vi.fn(),
    execute: vi.fn().mockResolvedValue({ txHash: '0xabc123' }),
  };
}

const withdrawParams = {
  amount: '0.001',
  sourceChain: Chain.ETHEREUM_MAINNET,
  destChain: Chain.BITCOIN_MAINNET,
  recipient: 'bc1q_btc_address',
  assetOut: AssetId.BTC,
};

describe('useEvmWithdraw', () => {
  let mockAction: ReturnType<typeof createMockUnstakeAction>;
  let mockSdk: { chain: { evm: { withdraw: ReturnType<typeof vi.fn> } } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAction = createMockUnstakeAction();
    mockAction.prepare.mockResolvedValue(undefined);
    mockAction.authorizeFee.mockResolvedValue(undefined);

    mockSdk = {
      chain: {
        evm: {
          withdraw: vi.fn().mockReturnValue(mockAction),
        },
      },
    };
  });

  it('returns idle state when sdk is null', () => {
    const { result } = renderHook(() => useEvmWithdraw(null));

    expect(result.current.status.phase).toBe('idle');
    expect(result.current.txHash).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('completes a full withdrawal without authorizeFee', async () => {
    mockAction.status = EvmOperationStatus.READY;

    const { result } = renderHook(() => useEvmWithdraw(mockSdk as never));

    await act(async () => {
      await result.current.withdraw(withdrawParams);
    });

    expect(mockSdk.chain.evm.withdraw).toHaveBeenCalledWith({
      assetIn: AssetId.LBTC,
      assetOut: withdrawParams.assetOut,
      sourceChain: withdrawParams.sourceChain,
      destChain: withdrawParams.destChain,
    });
    expect(mockAction.prepare).toHaveBeenCalledWith({
      amount: withdrawParams.amount,
      recipient: withdrawParams.recipient,
    });
    expect(mockAction.authorizeFee).not.toHaveBeenCalled();
    expect(mockAction.execute).toHaveBeenCalled();
    expect(result.current.txHash).toBe('0xabc123');
    expect(result.current.status.phase).toBe('complete');
    expect(result.current.isLoading).toBe(false);
  });

  it('calls authorizeFee when status is NEEDS_FEE_AUTHORIZATION', async () => {
    mockAction.prepare.mockImplementation(() => {
      mockAction.status = EvmOperationStatus.NEEDS_FEE_AUTHORIZATION;
      return Promise.resolve(undefined);
    });
    mockAction.authorizeFee.mockImplementation(() => {
      mockAction.status = EvmOperationStatus.READY;
      return Promise.resolve(undefined);
    });

    const { result } = renderHook(() => useEvmWithdraw(mockSdk as never));

    await act(async () => {
      await result.current.withdraw(withdrawParams);
    });

    expect(mockAction.authorizeFee).toHaveBeenCalled();
    expect(result.current.txHash).toBe('0xabc123');
    expect(result.current.status.phase).toBe('complete');
  });

  it('sets error on failure and reset clears state', async () => {
    mockAction.prepare.mockRejectedValue(new Error('Execution failed'));

    const { result } = renderHook(() => useEvmWithdraw(mockSdk as never));

    await act(async () => {
      await result.current.withdraw(withdrawParams).catch(() => {});
    });

    expect(result.current.error).toBe('Execution failed');
    expect(result.current.status.phase).toBe('error');
    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.status.phase).toBe('idle');
    expect(result.current.txHash).toBeNull();
  });
});
