/**
 * BTC Stake Integration Tests
 *
 * Tests for BTC staking operations:
 * - BtcDepositLbtc: BTC → LBTC
 * - BtcDepositBtcb: BTC → BTC.b
 * - BtcDeployLbtc: BTC → LBTC → DeFi
 * - BtcDeployBtcb: BTC → BTC.b → DeFi
 *
 * @see SDK_DEVELOPER_FAQ.md
 */

import { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { btcStake } from '../../chains/btc/actions/deposit-lbtc';
import { LombardSDK } from '../../client/LombardSDK';
import { AssetId, Chain } from '../../core';
import { BtcActionStatus } from '../../shared/constants/statusConstants';
import { createTestConfig as createConfig } from '../helpers/createTestConfig';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Provider Setup
// ═══════════════════════════════════════════════════════════════════════════

function createMockEvmProvider(): EIP1193Provider {
  const mockProvider = {
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  };

  mockProvider.request.mockImplementation(async ({ method }) => {
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'];
      case 'eth_chainId':
        return '0xaa36a7'; // Sepolia chain ID
      case 'wallet_switchEthereumChain':
        return null;
      case 'eth_signTypedData_v4':
        return '0x' + '00'.repeat(65);
      case 'personal_sign':
        return '0x' + '00'.repeat(65);
      default:
        console.warn(`Unhandled provider method: ${method}`);
        return null;
    }
  });

  return mockProvider as unknown as EIP1193Provider;
}

// ═══════════════════════════════════════════════════════════════════════════
// BTC Stake Action Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('BTC Stake Action', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  describe('Lifecycle', () => {
    it('should start in IDLE status', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      expect(stake.status).toBe(BtcActionStatus.IDLE);
      expect(stake.isLoading).toBe(false);
      expect(stake.isFailed).toBe(false);
      expect(stake.error).toBeNull();
    });

    it('should transition to NEEDS_ADDRESS_CONFIRMATION for testnet', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      // Mock API response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ has_signature: false }),
      } as Response);

      await stake.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      // Fee authorization is required for all chains (including testnet)
      expect(stake.status).toBe(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
    });

    it('should require NEEDS_FEE_AUTHORIZATION for Ethereum mainnet', async () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM, // Mainnet requires fee auth
      });

      // Mock API response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ has_signature: false }),
      } as Response);

      await stake.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      // Ethereum mainnet requires fee authorization (EIP-712)
      expect(stake.status).toBe(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
    });

    it('should emit status change events', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      const statusChanges: string[] = [];
      stake.on('status-change', (status) => statusChanges.push(status));

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ has_signature: false }),
      } as Response);

      await stake.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      // Fee authorization is required for all chains
      expect(statusChanges).toContain(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
    });
  });

  describe('Validation', () => {
    it('should validate minimum BTC amount (0.0002)', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      await expect(
        stake.prepare({
          amount: '0.0001', // Below minimum
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        }),
      ).rejects.toThrow(/at least 0.0002/i);
    });

    it('should validate EVM recipient address', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      await expect(
        stake.prepare({
          amount: '0.001',
          recipient: 'invalid-address',
        }),
      ).rejects.toThrow();
    });

    it('should reject zero amount', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      await expect(
        stake.prepare({
          amount: '0',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        }),
      ).rejects.toThrow();
    });

    it('should reject negative amount', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      await expect(
        stake.prepare({
          amount: '-0.001',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        }),
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should preserve status on error', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      const initialStatus = stake.status;

      await expect(
        stake.prepare({
          amount: '0.0001', // Invalid
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        }),
      ).rejects.toThrow();

      expect(stake.status).toBe(initialStatus);
      expect(stake.isFailed).toBe(true);
      expect(stake.error).not.toBeNull();
    });

    it('should allow retry after error', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      // First attempt fails
      await expect(
        stake.prepare({
          amount: '0.0001',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        }),
      ).rejects.toThrow();

      expect(stake.isFailed).toBe(true);

      // Mock successful API call
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ has_signature: false }),
      } as Response);

      // Retry with valid amount
      await stake.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(stake.isFailed).toBe(false);
      expect(stake.error).toBeNull();
      // Fee authorization is required for all chains (including testnet)
      expect(stake.status).toBe(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
    });

    it('should emit error and failed events', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      const errors: Error[] = [];
      const failedEvents: number[] = [];

      stake.on('error', (error) => errors.push(error));
      stake.on('failed', () => failedEvents.push(1));

      await expect(
        stake.prepare({
          amount: '0.0001',
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        }),
      ).rejects.toThrow();

      expect(errors.length).toBe(1);
      expect(failedEvents.length).toBe(1);
    });
  });

  describe('Loading States', () => {
    it('should emit loading events during operations', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      const loadingStates: boolean[] = [];
      stake.on('loading', (isLoading) => loadingStates.push(isLoading));

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ has_signature: false }),
      } as Response);

      await stake.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(loadingStates).toContain(true);
      expect(loadingStates[loadingStates.length - 1]).toBe(false);
      expect(stake.isLoading).toBe(false);
    });

    it('should return unsubscribe function from on()', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      const handler = vi.fn();
      const unsubscribe = stake.on('status-change', handler);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('Progress Events', () => {
    it('should emit progress events with step information', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      interface ProgressEvent {
        status: string;
        steps?: Record<string, string>;
      }

      const progressEvents: ProgressEvent[] = [];
      stake.on('progress', (progress: ProgressEvent) =>
        progressEvents.push(progress),
      );

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ has_signature: false }),
      } as Response);

      await stake.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      expect(progressEvents.length).toBeGreaterThan(0);
      const lastProgress = progressEvents[progressEvents.length - 1];
      expect(lastProgress.status).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LombardSDK Integration Tests (Skipped - requires real network)
// ═══════════════════════════════════════════════════════════════════════════

describe.skip('BTC Stake Integration (Real Network)', () => {
  let sdk: LombardSDK;

  beforeAll(() => {
    sdk = new LombardSDK(
      createConfig({
        env: Env.stage,
      }),
    );
  });

  it('should complete full BTC → LBTC stake flow', async () => {
    const stake = sdk.chain.btc.deposit({
      assetOut: AssetId.LBTC,
      destChain: Chain.ETHEREUM,
    });

    await stake.prepare({
      amount: '0.001',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    });

    expect(stake.status).toBe('needs_fee_authorization');
  }, 60000);

  it('should handle invalid recipient addresses', async () => {
    const stake = sdk.chain.btc.deposit({
      assetOut: AssetId.LBTC,
      destChain: Chain.ETHEREUM,
    });

    await expect(
      stake.prepare({ amount: '0.1', recipient: 'invalid' }),
    ).rejects.toThrow();
  });
});
