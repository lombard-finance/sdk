import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { normalizeStrategyConfig } from '../../../strategies/lib/metrics/getStrategyConfig';

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}));

describe('normalizeStrategyConfig', () => {
  it('fills defaults for an empty payload (gRPC-Gateway field omission)', () => {
    const out = normalizeStrategyConfig({});
    expect(out).toMatchObject({
      name: '',
      symbol: '',
      decimals: 0,
      shards: [],
      defaultShard: undefined,
      withdrawalTargetSeconds: 0,
      apy: undefined,
      tvlBaseAsset: undefined,
      allocations: undefined,
    });
    expect(out.depositAssets).toEqual([]);
    expect(out.feeConfig).toEqual({
      managementFeeBps: 0,
      performanceFeeBps: 0,
      redeemFeeBps: 0,
    });
    expect(out.baseAsset.address).toBe(
      '0x0000000000000000000000000000000000000000',
    );
  });

  it('drops deposit_assets entries with missing token or converter', () => {
    const out = normalizeStrategyConfig({
      deposit_assets: [
        {
          token: '0x731eFa688F3679688cf60A3993b8658138953ED6',
          converter: '0xFAf935d84fC3E3F557a7708F90c0e1b622c12fBF',
          symbol: 'LBTC',
          decimals: 8,
        },
        { symbol: 'NO_TOKEN', decimals: 8 } as never,
        { token: '0x1234567890123456789012345678901234567890' } as never,
      ],
    });
    expect(out.depositAssets).toHaveLength(1);
    expect(out.depositAssets[0].symbol).toBe('LBTC');
  });

  it('preserves fee_config when fully populated', () => {
    const out = normalizeStrategyConfig({
      fee_config: {
        management_fee_bps: 100,
        performance_fee_bps: 200,
        redeem_fee_bps: 50,
      },
    });
    expect(out.feeConfig).toEqual({
      managementFeeBps: 100,
      performanceFeeBps: 200,
      redeemFeeBps: 50,
    });
  });

  it('renames allocations and only includes them when non-empty', () => {
    const empty = normalizeStrategyConfig({ allocations: [] });
    expect(empty.allocations).toBeUndefined();

    const filled = normalizeStrategyConfig({
      allocations: [
        {
          id: 'a1',
          allocation: '0.5',
          collateral: '1',
          debt: '0.5',
          protocol: 'aave',
          active_position: '1',
        },
      ],
    });
    expect(filled.allocations).toEqual([
      {
        id: 'a1',
        allocation: '0.5',
        collateral: '1',
        debt: '0.5',
        protocol: 'aave',
        activePosition: '1',
      },
    ]);
  });
});

describe('getStrategyConfig (input validation)', () => {
  it('rejects unsupported chain ids', async () => {
    const { getStrategyConfig } =
      await import('../../../strategies/lib/metrics/getStrategyConfig');
    await expect(
      getStrategyConfig({ chainId: ChainId.ethereum, env: Env.prod }),
    ).rejects.toThrow(/Unsupported chain id/);
  });
});
