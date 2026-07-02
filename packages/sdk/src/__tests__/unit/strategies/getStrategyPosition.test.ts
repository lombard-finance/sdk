import { Env } from '@lombard.finance/sdk-common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { getStrategyPosition } from '../../../strategies/lib/ops/getStrategyPosition';

const multicall = vi.fn();

vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({ multicall })),
}));

const ACCOUNT = '0x000000000000000000000000000000000000dEaD' as const;

afterEach(() => {
  multicall.mockReset();
});

describe('getStrategyPosition', () => {
  it('computes shares, baseAssetValue and pending from multicall results', async () => {
    multicall.mockResolvedValueOnce([
      200000000n, // balanceOf → 2.0 shares
      50000000n, // pendingAssetsOf → 0.5 base asset
      150000000n, // pricePerShare → 1.5
      8, // decimals
    ]);

    const pos = await getStrategyPosition({
      chainId: ChainId.baseSepoliaTestnet,
      env: Env.testnet,
      account: ACCOUNT,
    });

    expect(pos.sharesRaw).toBe(200000000n);
    expect(pos.shares.toString()).toBe('2');
    expect(pos.baseAssetValue.toString()).toBe('3');
    expect(pos.pendingBaseAsset.toString()).toBe('0.5');
  });

  it('rejects invalid account address', async () => {
    await expect(
      getStrategyPosition({
        chainId: ChainId.baseSepoliaTestnet,
        env: Env.testnet,
        account: 'not-an-address' as never,
      }),
    ).rejects.toThrow(/Invalid account address/);
    expect(multicall).not.toHaveBeenCalled();
  });

  it('rejects unsupported chain ids before issuing any RPC', async () => {
    await expect(
      getStrategyPosition({
        chainId: ChainId.sepolia,
        env: Env.prod,
        account: ACCOUNT,
      }),
    ).rejects.toThrow(/Unsupported chain id/);
    expect(multicall).not.toHaveBeenCalled();
  });
});
