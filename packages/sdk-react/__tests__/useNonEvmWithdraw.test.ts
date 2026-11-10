import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNonEvmWithdraw } from '../src/hooks/useNonEvmWithdraw';

vi.mock('@lombard.finance/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lombard.finance/sdk')>();
  return { ...actual };
});

import { AssetId, Chain } from '@lombard.finance/sdk';

function createMockAction() {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return () => {
        handlers[event] = handlers[event].filter((h) => h !== handler);
      };
    }),
    prepare: vi.fn(),
    execute: vi.fn().mockResolvedValue({ txHash: 'solana_tx_hash' }),
  };
}

const withdrawParams = {
  amount: '0.001',
  sourceChain: Chain.SOLANA_MAINNET,
  destChain: Chain.BITCOIN_MAINNET,
  recipient: 'bc1q_btc_address',
};

describe('useNonEvmWithdraw', () => {
  let mockAction: ReturnType<typeof createMockAction>;
  let mockSdk: {
    chain: {
      solana: { withdraw: ReturnType<typeof vi.fn> };
      starknet: { withdraw: ReturnType<typeof vi.fn> };
      sui: { withdraw: ReturnType<typeof vi.fn> };
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAction = createMockAction();
    mockAction.prepare.mockResolvedValue(undefined);

    mockSdk = {
      chain: {
        solana: { withdraw: vi.fn().mockReturnValue(mockAction) },
        starknet: { withdraw: vi.fn().mockReturnValue(mockAction) },
        sui: { withdraw: vi.fn().mockReturnValue(mockAction) },
      },
    };
  });

  it('returns idle state when sdk is null', () => {
    const { result } = renderHook(() => useNonEvmWithdraw(null, 'solana'));

    expect(result.current.status.phase).toBe('idle');
    expect(result.current.txHash).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('throws when called with null sdk', async () => {
    const { result } = renderHook(() => useNonEvmWithdraw(null, 'solana'));

    await expect(result.current.withdraw(withdrawParams)).rejects.toThrow(
      'SDK not initialized',
    );
  });

  it('completes a full withdrawal and returns txHash', async () => {
    const { result } = renderHook(() =>
      useNonEvmWithdraw(mockSdk as never, 'solana'),
    );

    await act(async () => {
      await result.current.withdraw(withdrawParams);
    });

    expect(mockSdk.chain.solana.withdraw).toHaveBeenCalledWith({
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
      sourceChain: withdrawParams.sourceChain,
      destChain: withdrawParams.destChain,
    });
    expect(mockAction.prepare).toHaveBeenCalledWith({
      amount: withdrawParams.amount,
      recipient: withdrawParams.recipient,
    });
    expect(mockAction.execute).toHaveBeenCalled();
    expect(result.current.txHash).toBe('solana_tx_hash');
    expect(result.current.status.phase).toBe('complete');
    expect(result.current.isLoading).toBe(false);
  });

  it('routes to the correct chain namespace', async () => {
    const { result: starknetResult } = renderHook(() =>
      useNonEvmWithdraw(mockSdk as never, 'starknet'),
    );

    await act(async () => {
      await starknetResult.current.withdraw({
        ...withdrawParams,
        sourceChain: Chain.STARKNET_MAINNET,
      });
    });

    expect(mockSdk.chain.starknet.withdraw).toHaveBeenCalled();
    expect(mockSdk.chain.solana.withdraw).not.toHaveBeenCalled();
  });

  it('sets error on failure and reset clears state', async () => {
    mockAction.execute.mockRejectedValue(new Error('Burn failed'));

    const { result } = renderHook(() =>
      useNonEvmWithdraw(mockSdk as never, 'solana'),
    );

    await act(async () => {
      await result.current.withdraw(withdrawParams).catch(() => {});
    });

    expect(result.current.error).toBe('Burn failed');
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
