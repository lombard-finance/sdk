/**
 * EVM Unstake Fee Authorization Status Tests
 *
 * Verifies that prepare() correctly transitions to NEEDS_FEE_AUTHORIZATION
 * when checkFeeAuthorization returns requiresAuth: true, hasValidSignature: false.
 *
 * Regression test for bug: act()'s successStatus was eagerly evaluated before
 * the callback ran, using initial feeAuth state (requiresAuth: false). This
 * always resolved to READY, overwriting NEEDS_FEE_AUTHORIZATION set inside
 * the callback. As a result, authorizeFee() was never called.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EvmUnstake } from '../../../chains/evm/actions/unstake/EvmUnstake';
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

describe('EvmUnstake fee authorization status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions to NEEDS_FEE_AUTHORIZATION when fee auth required and no valid signature', async () => {
    const { checkFeeAuthorization } = await import(
      '../../../chains/evm/shared/feeAuth'
    );

    // Mock: fee auth required, no valid signature (unsubsidized chain like Ethereum)
    vi.mocked(checkFeeAuthorization).mockResolvedValue({
      requiresAuth: true,
      hasValidSignature: false,
      feeInSatoshis: BigInt(1992),
      feeFormatted: '0.00001992',
      expirationDate: null,
    });

    const ctx = createContext();
    const unstake = new EvmUnstake(ctx, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.ETHEREUM,
    });

    expect(unstake.status).toBe(EvmOperationStatus.IDLE);

    await unstake.prepare({
      amount: '10000',
      recipient: '0x0000000000000000000000000000000000000002',
    });

    // This is the critical assertion that caught the bug:
    // With the old code, act()'s successStatus always evaluated to READY
    // because _feeAuth.requiresAuth was false at evaluation time.
    // After act()'s callback set status to NEEDS_FEE_AUTHORIZATION,
    // act() would overwrite it back to READY.
    expect(unstake.status).toBe(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);
    expect(unstake.feeAuth.requiresAuth).toBe(true);
    expect(unstake.feeAuth.isAuthorized).toBe(false);
    expect(unstake.feeAuth.feeInSatoshis).toBe(BigInt(1992));
  });

  it('transitions to READY when fee auth not required (subsidized chain)', async () => {
    const { checkFeeAuthorization } = await import(
      '../../../chains/evm/shared/feeAuth'
    );

    // Mock: no fee auth required (subsidized chain like Base)
    vi.mocked(checkFeeAuthorization).mockResolvedValue({
      requiresAuth: false,
      hasValidSignature: false,
      feeInSatoshis: null,
      feeFormatted: null,
      expirationDate: null,
    });

    const ctx = createContext();
    const unstake = new EvmUnstake(ctx, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      sourceChain: Chain.BASE,
      destChain: Chain.BASE,
    });

    await unstake.prepare({
      amount: '10000',
      recipient: '0x0000000000000000000000000000000000000002',
    });

    expect(unstake.status).toBe(EvmOperationStatus.READY);
    expect(unstake.feeAuth.requiresAuth).toBe(false);
  });

  it('transitions to READY when fee auth required but valid signature exists', async () => {
    const { checkFeeAuthorization } = await import(
      '../../../chains/evm/shared/feeAuth'
    );

    // Mock: fee auth required AND valid signature already exists
    vi.mocked(checkFeeAuthorization).mockResolvedValue({
      requiresAuth: true,
      hasValidSignature: true,
      feeInSatoshis: BigInt(1992),
      feeFormatted: '0.00001992',
      expirationDate: String(Math.floor(Date.now() / 1000) + 3600),
    });

    const ctx = createContext();
    const unstake = new EvmUnstake(ctx, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.ETHEREUM,
    });

    await unstake.prepare({
      amount: '10000',
      recipient: '0x0000000000000000000000000000000000000002',
    });

    expect(unstake.status).toBe(EvmOperationStatus.READY);
    expect(unstake.feeAuth.requiresAuth).toBe(true);
    expect(unstake.feeAuth.isAuthorized).toBe(true);
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
    const unstake = new EvmUnstake(ctx, {
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.ETHEREUM,
    });

    const statusChanges: string[] = [];
    unstake.on('status-change', (...args: unknown[]) => {
      statusChanges.push(args[0] as string);
    });

    await unstake.prepare({
      amount: '10000',
      recipient: '0x0000000000000000000000000000000000000002',
    });

    // Should include NEEDS_FEE_AUTHORIZATION in emitted statuses
    expect(statusChanges).toContain(
      EvmOperationStatus.NEEDS_FEE_AUTHORIZATION,
    );
    // Should NOT contain READY (the bug would emit READY after NEEDS_FEE_AUTHORIZATION)
    expect(statusChanges).not.toContain(EvmOperationStatus.READY);
  });
});
