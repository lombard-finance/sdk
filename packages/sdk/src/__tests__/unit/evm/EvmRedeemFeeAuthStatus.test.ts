/**
 * EVM Redeem prepare() status transition tests
 *
 * EVM Redeem releases native BTC on the Bitcoin network. There is no EVM
 * auto-mint on the destination, so the action never requires network-fee
 * authorization — `prepare()` must transition straight to READY regardless of
 * the source chain (including Ethereum / Sepolia, which DO require fee auth
 * for BTC Deposit and EVM Unstake to BTC.b).
 *
 * This file used to assert the opposite behavior; the assertions are inverted
 * here to lock in the new contract and act as a regression guard.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EvmRedeem } from '../../../chains/evm/actions/redeem/EvmRedeem';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import { EvmOperationStatus } from '../../../shared/constants/statusConstants';
import type { EvmCoreContext } from '../../../shared/context/types';

const mockProvider = {
  request: vi.fn(async ({ method }: { method: string }) => {
    if (method === 'eth_accounts') {
      return ['0x0000000000000000000000000000000000000002'];
    }
    return [];
  }),
};

function createContext(env: Env = Env.prod): EvmCoreContext {
  return {
    env,
    partner: new PartnerConfiguration(undefined),
    getProvider: async () => mockProvider,
    evm: {} as EvmCoreContext['evm'],
  };
}

describe('EvmRedeem prepare()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transitions IDLE → READY on Ethereum (no fee auth for BTC destination)', async () => {
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

    expect(redeem.status).toBe(EvmOperationStatus.READY);
    expect(redeem.feeAuth.requiresAuth).toBe(false);
    expect(redeem.feeAuth.isAuthorized).toBe(false);
    expect(redeem.feeAuth.feeInSatoshis).toBeNull();
  });

  it('transitions IDLE → READY on Sepolia (testnet of an unsubsidized chain)', async () => {
    const ctx = createContext(Env.testnet);
    const redeem = new EvmRedeem(ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChain: Chain.SEPOLIA,
      destChain: Chain.BITCOIN_SIGNET,
    });

    await redeem.prepare({
      amount: '10000',
      recipient: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
    });

    expect(redeem.status).toBe(EvmOperationStatus.READY);
    expect(redeem.feeAuth.requiresAuth).toBe(false);
  });

  it('transitions IDLE → READY on subsidized source chain (Base)', async () => {
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

  it('never emits NEEDS_FEE_AUTHORIZATION status-change', async () => {
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

    expect(statusChanges).not.toContain(
      EvmOperationStatus.NEEDS_FEE_AUTHORIZATION,
    );
    expect(statusChanges).toContain(EvmOperationStatus.READY);
  });
});

describe('EvmRedeem.authorizeFee() (deprecated no-op)', () => {
  it('resolves without changing status when called before prepare()', async () => {
    const ctx = createContext();
    const redeem = new EvmRedeem(ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.BITCOIN_MAINNET,
    });

    await expect(redeem.authorizeFee()).resolves.toBeUndefined();
    expect(redeem.status).toBe(EvmOperationStatus.IDLE);
  });

  it('resolves without changing status when called after prepare() in READY', async () => {
    const ctx = createContext();
    const redeem = new EvmRedeem(ctx, {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChain: Chain.ETHEREUM,
      destChain: Chain.BITCOIN_MAINNET,
    });

    await redeem.prepare({
      amount: '10000',
      recipient: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    });

    expect(redeem.status).toBe(EvmOperationStatus.READY);

    await expect(redeem.authorizeFee()).resolves.toBeUndefined();
    expect(redeem.status).toBe(EvmOperationStatus.READY);
  });
});
