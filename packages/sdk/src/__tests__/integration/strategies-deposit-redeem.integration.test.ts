import { Env } from '@lombard.finance/sdk-common';
import { encodeEventTopics } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';

import LOMBARD_STRATEGY_ABI from '../../strategies/abi/LOMBARD_STRATEGY_ABI.json';
import { getStrategyDeployment } from '../../strategies/lib/config';
import { depositStrategy } from '../../strategies/lib/ops/depositStrategy';
import { requestStrategyRedeem } from '../../strategies/lib/ops/requestStrategyRedeem';

const readContract = vi.fn();
const simulateContract = vi.fn();
const waitForTransactionReceipt = vi.fn();
const writeContract = vi.fn();

vi.mock('../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract,
    simulateContract,
    waitForTransactionReceipt,
  })),
}));

vi.mock('../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({ writeContract })),
}));

const ACCOUNT = '0x000000000000000000000000000000000000dEaD' as const;
const STAGE = getStrategyDeployment(Env.stage);
const STRATEGY = STAGE.contract;
const LBTC = STAGE.depositAssets.find((a) => a.symbol === 'LBTC')!.token;

afterEach(() => {
  readContract.mockReset();
  simulateContract.mockReset();
  waitForTransactionReceipt.mockReset();
  writeContract.mockReset();
});

describe('strategies: end-to-end deposit + requestRedeem (mocked)', () => {
  it('approves the Strategy, deposits, then redeems and exposes the requestId', async () => {
    // Deposit: zero allowance -> approve, then deposit
    readContract.mockResolvedValueOnce(0n);
    simulateContract
      .mockResolvedValueOnce({ request: { __approve: true } })
      .mockResolvedValueOnce({ request: { __deposit: true } });
    writeContract
      .mockResolvedValueOnce('0xapproveHash')
      .mockResolvedValueOnce('0xdepositHash');
    waitForTransactionReceipt.mockResolvedValueOnce({ status: 'success' });

    const depositHash = await depositStrategy({
      account: ACCOUNT,
      env: Env.stage,
      provider: {} as never,
      asset: LBTC,
      amount: '0.01',
      minSharesOut: 95000n,
    });

    expect(depositHash).toBe('0xdepositHash');
    expect(simulateContract).toHaveBeenCalledTimes(2);
    expect(simulateContract.mock.calls[1][0].args).toEqual([
      LBTC,
      1000000n,
      ACCOUNT,
      95000n,
    ]);

    // Redeem
    simulateContract.mockResolvedValueOnce({ request: { __redeem: true } });
    writeContract.mockResolvedValueOnce('0xredeemHash');

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
            '0x0000000000000000000000000000000000000000000000000000000000000007',
            `0x000000000000000000000000${ACCOUNT.slice(2)}`,
            `0x000000000000000000000000${ACCOUNT.slice(2)}`,
          ],
          data: ('0x' + '0'.repeat(192)) as `0x${string}`,
        },
      ],
    });

    const { txHash, requestId } = await requestStrategyRedeem({
      account: ACCOUNT,
      env: Env.stage,
      provider: {} as never,
      shares: 100000n,
    });

    expect(txHash).toBe('0xredeemHash');
    expect(requestId).toBe(7n);
  });

  it('skips approval on a subsequent deposit when allowance is already high', async () => {
    readContract.mockResolvedValueOnce(10n ** 18n);
    simulateContract.mockResolvedValueOnce({
      request: { __deposit: true },
    });
    writeContract.mockResolvedValueOnce('0xdeposit2Hash');

    const hash = await depositStrategy({
      account: ACCOUNT,
      env: Env.stage,
      provider: {} as never,
      asset: LBTC,
      amount: '0.005',
    });

    expect(hash).toBe('0xdeposit2Hash');
    expect(waitForTransactionReceipt).not.toHaveBeenCalled();
    expect(writeContract).toHaveBeenCalledTimes(1);
  });
});
