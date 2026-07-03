import { Env } from '@lombard.finance/sdk-common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getStrategyState } from '../../../strategies/lib/metrics/getStrategyState';

const multicall = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({ multicall })),
}));

afterEach(() => {
  multicall.mockReset();
});

describe('getStrategyState', () => {
  it('maps multicall results into IStrategyState', async () => {
    multicall.mockResolvedValueOnce([
      false, // paused
      false, // depositPaused
      false, // redeemPaused
      'BTCoc', // name
      'BTCstrc', // symbol
      8, // decimals
      '0xd0b479AD08733fd6C63ffdEf3F9c203394699125', // asset
      100000000n, // pricePerShare (1.0 in 1e8)
      500000000n, // totalAssets (5.0)
      500000000n, // totalSupply (5.0)
      [10000000n, 9000000n] as const, // totalPending: shares, assets
      [125, 0, '0x0000000000000000000000000000000000000000'] as const, // managementFee tuple
      [200, 0n, 0n] as const, // performanceFee tuple
      30, // redeemFee bps
    ]);

    const state = await getStrategyState({
      env: Env.stage,
    });

    expect(state.paused).toBe(false);
    expect(state.depositPaused).toBe(false);
    expect(state.redeemPaused).toBe(false);
    expect(state.name).toBe('BTCoc');
    expect(state.symbol).toBe('BTCstrc');
    expect(state.decimals).toBe(8);
    expect(state.baseAssetAddress).toBe(
      '0xd0b479AD08733fd6C63ffdEf3F9c203394699125',
    );
    expect(state.pricePerShare.toString()).toBe('1');
    expect(state.totalAssets.toString()).toBe('5');
    expect(state.totalShares.toString()).toBe('5');
    expect(state.totalPending.shares.toString()).toBe('0.1');
    expect(state.totalPending.assets.toString()).toBe('0.09');
    expect(state.managementFeeBps).toBe(125);
    expect(state.performanceFeeBps).toBe(200);
    expect(state.redeemFeeBps).toBe(30);
  });

  it('rejects an environment the strategy is not deployed in', async () => {
    await expect(getStrategyState({ env: Env.testnet })).rejects.toThrow(
      /not deployed in env/,
    );
    expect(multicall).not.toHaveBeenCalled();
  });
});
