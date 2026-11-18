/**
 * EVM Unstake Wallet Connection Tests
 *
 * Verifies that prepare(), authorizeFee(), and execute() properly handle
 * disconnected wallets (eth_accounts returning empty array).
 *
 * Previously, prepare() and authorizeFee() cast accounts[0] without null
 * checking, silently passing undefined when the wallet was disconnected.
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
    authorizeFee: vi.fn(),
  };
});

vi.mock('../../../contract-functions', () => ({
  redeemToken: vi.fn(),
}));

/** Provider that returns empty accounts (wallet disconnected) */
function createDisconnectedProvider() {
  return {
    request: vi.fn(async () => []),
  };
}

/** Provider that returns a connected account */
function createConnectedProvider() {
  return {
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_accounts') {
        return ['0x0000000000000000000000000000000000000002'];
      }
      return [];
    }),
  };
}

function createContext(
  provider: ReturnType<typeof createDisconnectedProvider>,
): EvmCoreContext {
  return {
    env: Env.prod,
    partner: new PartnerConfiguration(undefined),
    getProvider: async () => provider,
    evm: {} as EvmCoreContext['evm'],
  };
}

describe('EvmUnstake wallet connection checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prepare() with disconnected wallet', () => {
    it('throws when wallet is disconnected during BTC.b unstake (fee auth path)', async () => {
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

      const provider = createDisconnectedProvider();
      const ctx = createContext(provider);
      const unstake = new EvmUnstake(ctx, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.ETHEREUM,
        destChain: Chain.ETHEREUM,
      });

      await expect(
        unstake.prepare({
          amount: '10000',
          recipient: '0x0000000000000000000000000000000000000002',
        }),
      ).rejects.toThrow();
    });
  });

  describe('authorizeFee() with disconnected wallet', () => {
    it('throws when wallet disconnects between prepare and authorizeFee', async () => {
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

      // Start with connected provider for prepare()
      const connectedProvider = createConnectedProvider();
      const ctx = createContext(connectedProvider);
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

      expect(unstake.status).toBe(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);

      // Simulate wallet disconnect: provider now returns empty accounts
      connectedProvider.request.mockImplementation(async () => []);

      await expect(unstake.authorizeFee()).rejects.toThrow();
    });
  });

  describe('execute() with disconnected wallet', () => {
    it('throws when wallet disconnects before execute', async () => {
      const connectedProvider = createConnectedProvider();
      const ctx = createContext(connectedProvider);
      const unstake = new EvmUnstake(ctx, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTC,
        sourceChain: Chain.BASE,
        destChain: Chain.BITCOIN_MAINNET,
      });

      await unstake.prepare({
        amount: '10000',
        recipient: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      });

      expect(unstake.status).toBe(EvmOperationStatus.READY);

      // Simulate wallet disconnect
      connectedProvider.request.mockImplementation(async () => []);

      await expect(unstake.execute()).rejects.toThrow();
    });
  });

  describe('prepare() with connected wallet', () => {
    it('succeeds when wallet is connected', async () => {
      const provider = createConnectedProvider();
      const ctx = createContext(provider);
      const unstake = new EvmUnstake(ctx, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTC,
        sourceChain: Chain.BASE,
        destChain: Chain.BITCOIN_MAINNET,
      });

      await unstake.prepare({
        amount: '10000',
        recipient: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
      });

      expect(unstake.status).toBe(EvmOperationStatus.READY);
    });
  });
});
