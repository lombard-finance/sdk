import { Env } from '@lombard.finance/sdk-common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getStrategyDeployment } from '../../../strategies/lib/config';
import { depositStrategy } from '../../../strategies/lib/ops/depositStrategy';

const readContract = vi.fn();
const simulateContract = vi.fn();
const waitForTransactionReceipt = vi.fn();
const writeContract = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({
    readContract,
    simulateContract,
    waitForTransactionReceipt,
  })),
}));

vi.mock('../../../clients/wallet-client', () => ({
  makeWalletClient: vi.fn(() => ({ writeContract })),
}));

const ACCOUNT = '0x000000000000000000000000000000000000dEaD' as const;
const STAGE = getStrategyDeployment(Env.stage);
const LBTC = STAGE.depositAssets.find((a) => a.symbol === 'LBTC')!.token;
const STRATEGY = STAGE.contract;

afterEach(() => {
  readContract.mockReset();
  simulateContract.mockReset();
  waitForTransactionReceipt.mockReset();
  writeContract.mockReset();
});

describe('depositStrategy', () => {
  it('skips approval when allowance is sufficient and calls deposit with 4 args', async () => {
    readContract.mockResolvedValueOnce(10n ** 18n); // huge allowance
    simulateContract.mockResolvedValueOnce({
      request: { __depositRequest: true },
    });
    writeContract.mockResolvedValueOnce('0xdepositHash');

    const hash = await depositStrategy({
      account: ACCOUNT,
      env: Env.stage,
      provider: {} as never,
      asset: LBTC,
      amount: '0.001',
    });

    expect(hash).toBe('0xdepositHash');
    expect(simulateContract).toHaveBeenCalledTimes(1);

    const call = simulateContract.mock.calls[0][0];
    expect(call.address).toBe(STRATEGY);
    expect(call.functionName).toBe('deposit');
    expect(call.args).toEqual([LBTC, 100000n, ACCOUNT, 0n]);
  });

  it('runs approve + deposit when allowance is insufficient', async () => {
    readContract.mockResolvedValueOnce(0n); // no allowance
    simulateContract
      .mockResolvedValueOnce({ request: { __approve: true } })
      .mockResolvedValueOnce({ request: { __deposit: true } });
    writeContract
      .mockResolvedValueOnce('0xapproveHash')
      .mockResolvedValueOnce('0xdepositHash');
    waitForTransactionReceipt.mockResolvedValueOnce({ status: 'success' });

    const hash = await depositStrategy({
      account: ACCOUNT,
      env: Env.stage,
      provider: {} as never,
      asset: LBTC,
      amount: '0.5',
      minSharesOut: 1n,
    });

    expect(hash).toBe('0xdepositHash');
    expect(writeContract).toHaveBeenCalledTimes(2);
    expect(waitForTransactionReceipt).toHaveBeenCalledTimes(1);

    const approveCall = simulateContract.mock.calls[0][0];
    expect(approveCall.address).toBe(LBTC);
    expect(approveCall.functionName).toBe('approve');
    expect(approveCall.args).toEqual([STRATEGY, 50000000n]);

    const depositCall = simulateContract.mock.calls[1][0];
    expect(depositCall.functionName).toBe('deposit');
    expect(depositCall.args).toEqual([LBTC, 50000000n, ACCOUNT, 1n]);
  });

  it('throws when allowance is insufficient and approve=false', async () => {
    readContract.mockResolvedValueOnce(0n);

    await expect(
      depositStrategy({
        account: ACCOUNT,
        env: Env.stage,
        provider: {} as never,
        asset: LBTC,
        amount: '0.001',
        approve: false,
      }),
    ).rejects.toThrow(/exceeds allowance/);
    expect(simulateContract).not.toHaveBeenCalled();
    expect(writeContract).not.toHaveBeenCalled();
  });

  it('rejects an environment the strategy is not deployed in', async () => {
    await expect(
      depositStrategy({
        account: ACCOUNT,
        env: Env.testnet,
        provider: {} as never,
        asset: LBTC,
        amount: '0.001',
      }),
    ).rejects.toThrow(/not deployed in env/);
    expect(readContract).not.toHaveBeenCalled();
  });

  it('rejects amount <= 0', async () => {
    await expect(
      depositStrategy({
        account: ACCOUNT,
        env: Env.stage,
        provider: {} as never,
        asset: LBTC,
        amount: '0',
      }),
    ).rejects.toThrow(/greater than zero/);
  });

  it('requires assetDecimals for assets outside the static catalog', async () => {
    await expect(
      depositStrategy({
        account: ACCOUNT,
        env: Env.stage,
        provider: {} as never,
        asset: '0x0000000000000000000000000000000000001234',
        amount: '0.001',
      }),
    ).rejects.toThrow(/Could not resolve decimals/);
  });
});
