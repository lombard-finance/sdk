/**
 * EVM Redeem Fee Authorization Status Tests
 *
 * Verifies that prepare() correctly transitions to NEEDS_FEE_AUTHORIZATION
 * when checkFeeAuthorization returns requiresAuth: true, hasValidSignature: false.
 *
 * Regression test for bug: act()'s successStatus was eagerly evaluated before
 * the callback ran, using initial feeAuth state (requiresAuth: false). This
 * always resolved to READY, overwriting NEEDS_FEE_AUTHORIZATION set inside
 * the callback.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EvmRedeem } from '../../../chains/evm/actions/redeem/EvmRedeem';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import { EvmOperationStatus } from '../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../shared/context/types';

vi.mock('../../../chains/evm/shared/feeAuth', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../chains/evm/shared/feeAuth')>();
  return {
    ...actual,
    checkFeeAuthorization: vi.fn(),
  };
});

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

describe('EvmRedeem fee authorization status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions to NEEDS_FEE_AUTHORIZATION when fee auth required and no valid signature', async () => {
    const { checkFeeAuthorization } = await import(
      '../../../chains/evm/shared/feeAuth'
    );

    vi.mocked(checkFeeAuthorization).mockResolvedValue({
      requiresAuth: true,
      hasValidSignature: false,
      feeInSatoshis: BigInt(1992),
      feeFormatted: '0.00001992',
      expirationDate: null,
    });

    const ctx = createContext();
    const redeem = new EvmRedeem(ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.BITCOIN_MAINNET,
    });

    expect(redeem.status).toBe(EvmOperationStatus.IDLE);

    await redeem.prepare({
      amount: '10000',
      recipient: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    });

    expect(redeem.status).toBe(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);
    expect(redeem.feeAuth.requiresAuth).toBe(true);
    expect(redeem.feeAuth.isAuthorized).toBe(false);
    expect(redeem.feeAuth.feeInSatoshis).toBe(BigInt(1992));
  });

  it('transitions to READY when fee auth not required (subsidized chain)', async () => {
    const { checkFeeAuthorization } = await import(
      '../../../chains/evm/shared/feeAuth'
    );

    vi.mocked(checkFeeAuthorization).mockResolvedValue({
      requiresAuth: false,
      hasValidSignature: false,
      feeInSatoshis: null,
      feeFormatted: null,
      expirationDate: null,
    });

    const ctx = createContext();
    const redeem = new EvmRedeem(ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChain: Chain.BASE,
      destChain: Chain.BITCOIN_MAINNET,
    });

    await redeem.prepare({
      amount: '10000',
      recipient: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    });

    expect(redeem.status).toBe(EvmOperationStatus.READY);
    expect(redeem.feeAuth.requiresAuth).toBe(false);
  });

  it('emits status-change event with NEEDS_FEE_AUTHORIZATION', async () => {
    const { checkFeeAuthorization } = await import(
      '../../../chains/evm/shared/feeAuth'
    );

    vi.mocked(checkFeeAuthorization).mockResolvedValue({
      requiresAuth: true,
      hasValidSignature: false,
      feeInSatoshis: BigInt(1992),
      feeFormatted: '0.00001992',
      expirationDate: null,
    });

    const ctx = createContext();
    const redeem = new EvmRedeem(ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.BITCOIN_MAINNET,
    });

    const statusChanges: string[] = [];
    redeem.on('status-change', (...args: unknown[]) => {
      statusChanges.push(args[0] as string);
    });

    await redeem.prepare({
      amount: '10000',
      recipient: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    });

    expect(statusChanges).toContain(
      EvmOperationStatus.NEEDS_FEE_AUTHORIZATION,
    );
    expect(statusChanges).not.toContain(EvmOperationStatus.READY);
  });
});
