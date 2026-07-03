import { Env } from '@lombard.finance/sdk-common';
import { encodeEventTopics } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LOMBARD_STRATEGY_ABI from '../../../strategies/abi/LOMBARD_STRATEGY_ABI.json';
import { getStrategyDeployment } from '../../../strategies/lib/config';
import { requestStrategyRedeem } from '../../../strategies/lib/ops/requestStrategyRedeem';

const simulateContract = vi.fn();
const waitForTransactionReceipt = vi.fn();
const writeContract = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    simulateContract,
    waitForTransactionReceipt,
  })),
}));

vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({ writeContract })),
}));

const ACCOUNT = '0x000000000000000000000000000000000000dEaD' as const;
const STRATEGY = getStrategyDeployment(Env.stage).contract;

afterEach(() => {
  simulateContract.mockReset();
  waitForTransactionReceipt.mockReset();
  writeContract.mockReset();
});

describe('requestStrategyRedeem', () => {
  it('parses requestId from RedeemRequested event when receipt is awaited', async () => {
    simulateContract.mockResolvedValueOnce({ request: { __redeem: true } });
    writeContract.mockResolvedValueOnce('0xredeemHash');

    // Build a minimal log that matches RedeemRequested topic
    const topics = encodeEventTopics({
      abi: LOMBARD_STRATEGY_ABI,
      eventName: 'RedeemRequested',
    });

    waitForTransactionReceipt.mockResolvedValueOnce({
      status: 'success',
      logs: [
        {
          address: STRATEGY,
          topics: [
            ...topics,
            // requestId (indexed) = 42
            '0x000000000000000000000000000000000000000000000000000000000000002a',
            // owner (indexed)
            `0x000000000000000000000000${ACCOUNT.slice(2)}`,
            // sender (indexed)
            `0x000000000000000000000000${ACCOUNT.slice(2)}`,
          ],
          // Non-indexed args: assets, shares, feeShares (3 * 32 bytes = 192 hex chars)
          data: ('0x' + '0'.repeat(192)) as `0x${string}`,
        },
      ],
    });

    const { txHash, requestId } = await requestStrategyRedeem({
      account: ACCOUNT,
      env: Env.stage,
      provider: {} as never,
      shares: 100000000n,
    });

    expect(txHash).toBe('0xredeemHash');
    expect(requestId).toBe(42n);

    const sim = simulateContract.mock.calls[0][0];
    expect(sim.functionName).toBe('requestRedeem');
    expect(sim.args).toEqual([100000000n, ACCOUNT]);
  });

  it('returns undefined requestId when waitForReceipt=false', async () => {
    simulateContract.mockResolvedValueOnce({ request: { __redeem: true } });
    writeContract.mockResolvedValueOnce('0xredeemHash');

    const result = await requestStrategyRedeem({
      account: ACCOUNT,
      env: Env.stage,
      provider: {} as never,
      shares: 1n,
      waitForReceipt: false,
    });

    expect(result).toEqual({
      txHash: '0xredeemHash',
      requestId: undefined,
    });
    expect(waitForTransactionReceipt).not.toHaveBeenCalled();
  });

  it('rejects shares <= 0', async () => {
    await expect(
      requestStrategyRedeem({
        account: ACCOUNT,
        env: Env.stage,
        provider: {} as never,
        shares: 0n,
      }),
    ).rejects.toThrow(/greater than zero/);
  });

  it('rejects an environment the strategy is not deployed in', async () => {
    await expect(
      requestStrategyRedeem({
        account: ACCOUNT,
        env: Env.testnet,
        provider: {} as never,
        shares: 1n,
      }),
    ).rejects.toThrow(/not deployed in env/);
  });
});
