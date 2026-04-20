import { Env } from '@lombard.finance/sdk-common';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { EvmUnstake } from '../../../chains/evm/actions/unstake/EvmUnstake';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import { EvmOperationStatus } from '../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../shared/context/types';

vi.mock('../../../chains/evm/shared/feeAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../chains/evm/shared/feeAuth')>();
  return {
    ...actual,
    checkFeeAuthorization: vi.fn(async () => ({
      requiresAuth: false,
      hasValidSignature: false,
      feeInSatoshis: null,
      feeFormatted: null,
      expirationDate: null,
    })),
  };
});

vi.mock('../../../contract-functions/approveToken', () => ({
  approveToken: vi.fn(),
  getTokenAllowance: vi.fn(),
}));

const mockProvider = {
  request: vi.fn(async ({ method }: { method: string }) => {
    if (method === 'eth_accounts') {
      return ['0x0000000000000000000000000000000000000002'];
    }
    return [];
  }),
};

function createContext(): EvmCoreContext {
  return {
    env: Env.prod,
    partner: new PartnerConfiguration(undefined),
    getProvider: async () => mockProvider,
    evm: {} as EvmCoreContext['evm'],
  };
}

describe('EvmUnstake allowance handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not request ERC-20 approval for LBTC → BTC.b', async () => {
    const { approveToken, getTokenAllowance } = await import('../../../contract-functions/approveToken');

    const ctx = createContext();
    const unstake = new EvmUnstake(ctx, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      sourceChain: Chain.BASE,
      destChain: Chain.BASE,
    });

    await unstake.prepare({ amount: '10000', recipient: '0x0000000000000000000000000000000000000002' });

    expect(unstake.status).toBe(EvmOperationStatus.READY);
    expect(approveToken).not.toHaveBeenCalled();
    expect(getTokenAllowance).not.toHaveBeenCalled();
  });
});
