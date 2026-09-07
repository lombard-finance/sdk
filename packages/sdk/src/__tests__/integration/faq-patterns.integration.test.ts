/**
 * FAQ Patterns Integration Tests
 *
 * Verifies that the patterns documented in SDK_DEVELOPER_FAQ.md work correctly.
 * These tests ensure the FAQ remains accurate as the SDK evolves.
 *
 * @see SDK_DEVELOPER_FAQ.md sections 13, 14, 15, 16
 */

import { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { btcStake } from '../../chains/btc/actions/deposit-lbtc';
import { AssetId, Chain } from '../../core';
import { BtcActionStatus } from '../../shared/constants/statusConstants';
import { createTestConfig as createConfig } from '../helpers/createTestConfig';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Provider Setup (FAQ Section 17)
// ═══════════════════════════════════════════════════════════════════════════

function createMockEvmProvider(): EIP1193Provider {
  const mockProvider = {
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  };

  // Default implementation for common methods
  mockProvider.request.mockImplementation(async ({ method }) => {
    switch (method) {
      case 'eth_requestAccounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'];
      case 'eth_accounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'];
      case 'eth_chainId':
        return '0xaa36a7'; // Sepolia chain ID (11155111 in hex)
      case 'wallet_switchEthereumChain':
        return null;
      case 'eth_signTypedData_v4':
        // Return a mock signature
        return '0x' + '00'.repeat(65);
      default:
        console.warn(`Unhandled provider method: ${method}`);
        return null;
    }
  });

  return mockProvider as unknown as EIP1193Provider;
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 13: Using Actions - Lifecycle Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('FAQ Section 13: Using Actions', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  describe('Action Lifecycle', () => {
    it('should start in IDLE status', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      // FAQ documents: actions start in 'idle' status
      expect(stake.status).toBe(BtcActionStatus.IDLE);
      expect(stake.isLoading).toBe(false);
      expect(stake.isFailed).toBe(false);
      expect(stake.error).toBeNull();
    });

    it('should transition through statuses during prepare', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA, // Testnet - no fee auth needed
      });

      const statusChanges: string[] = [];
      stake.on('status-change', (status) => statusChanges.push(status));

      // Mock API response for deposit address check
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            has_signature: false,
          }),
      } as Response);

      await stake.prepare({
        amount: '0.001',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      });

      // Fee authorization is required for all chains (including testnet)
      expect(stake.status).toBe(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
      expect(statusChanges).toContain(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
    });

    it('should validate minimum BTC amount (0.0002)', async () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const stake = btcStake(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.SEPOLIA,
      });

      // FAQ documents: minimum stake is 0.0002 BTC
      await expect(
        stake.prepare({
          amount: '0.0001', // Below minimum
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        }),
      ).rejects.toThrow(/at least 0.0002/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 14: Loading States Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('FAQ Section 14: Loading States', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

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

    // Mock API
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ has_signature: false }),
    } as Response);

    await stake.prepare({
      amount: '0.001',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    });

    // FAQ documents: loading is true during operation, false after
    expect(loadingStates).toContain(true);
    expect(loadingStates[loadingStates.length - 1]).toBe(false);
    expect(stake.isLoading).toBe(false);
  });

  it('should allow combining status + isLoading for context-aware UI', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    const stake = btcStake(config, {
      assetOut: AssetId.LBTC,
      destChain: Chain.SEPOLIA,
    });

    // FAQ pattern: derive loading message from status + isLoading
    const getLoadingMessage = (status: string, isLoading: boolean): string => {
      if (!isLoading) return '';

      switch (status) {
        case 'idle':
          return 'Preparing...';
        case 'needs_fee_authorization':
          return 'Waiting for signature...';
        case 'ready':
          return 'Generating deposit address...';
        default:
          return 'Processing...';
      }
    };

    stake.on('loading', (isLoading) => {
      // Use loading message for UI updates
      getLoadingMessage(stake.status, isLoading);
    });

    // Mock API
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ has_signature: false }),
    } as Response);

    await stake.prepare({
      amount: '0.001',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    });

    // Message should have been set during loading
    // (captured message will be empty after loading completes)
    expect(stake.isLoading).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 15: Error Handling Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('FAQ Section 15: Error Handling', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  it('should preserve status on error (no FAILED status)', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    const stake = btcStake(config, {
      assetOut: AssetId.LBTC,
      destChain: Chain.SEPOLIA,
    });

    // FAQ documents: status should not change to FAILED on error
    const initialStatus = stake.status;

    await expect(
      stake.prepare({
        amount: '0.0001', // Invalid amount
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      }),
    ).rejects.toThrow();

    // Status should revert to previous (unchanged because prepare failed)
    expect(stake.status).toBe(initialStatus);
    expect(stake.isFailed).toBe(true);
    expect(stake.error).not.toBeNull();
  });

  it('should allow retry after error without re-initialization', async () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    const stake = btcStake(config, {
      assetOut: AssetId.LBTC,
      destChain: Chain.SEPOLIA, // Testnet - no fee auth, goes to address confirmation
    });

    // First attempt fails
    await expect(
      stake.prepare({
        amount: '0.0001', // Invalid
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      }),
    ).rejects.toThrow();

    expect(stake.isFailed).toBe(true);

    // Mock successful API call
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ has_signature: false }),
    } as Response);

    // Retry with valid amount - should work without creating new action
    await stake.prepare({
      amount: '0.001', // Valid
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    });

    // FAQ documents: error should be cleared on successful retry
    expect(stake.isFailed).toBe(false);
    expect(stake.error).toBeNull();
    // Fee authorization is required for all chains (including testnet)
    expect(stake.status).toBe(BtcActionStatus.NEEDS_FEE_AUTHORIZATION);
  });

  it('should emit error events', async () => {
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

    // FAQ documents: both error and failed events should be emitted
    expect(errors.length).toBe(1);
    expect(failedEvents.length).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 16: Events & Progress Monitoring Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('FAQ Section 16: Events & Progress Monitoring', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

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

    // Mock API
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ has_signature: false }),
    } as Response);

    await stake.prepare({
      amount: '0.001',
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    });

    // FAQ documents: progress events contain status and steps
    expect(progressEvents.length).toBeGreaterThan(0);
    const lastProgress = progressEvents[progressEvents.length - 1];
    expect(lastProgress.status).toBeDefined();
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

    // FAQ documents: on() returns unsubscribe function
    expect(typeof unsubscribe).toBe('function');

    // Should be callable without error
    unsubscribe();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Design Decisions Tests (FAQ Section 10)
// ═══════════════════════════════════════════════════════════════════════════

describe('FAQ Section 10: Design Decisions', () => {
  let mockProvider: EIP1193Provider;

  beforeEach(() => {
    mockProvider = createMockEvmProvider();
    vi.clearAllMocks();
  });

  it('should use unified BtcActionStatus for all BTC actions', () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    // FAQ documents: all BTC actions use BtcActionStatus
    const stake = btcStake(config, {
      assetOut: AssetId.LBTC,
      destChain: Chain.SEPOLIA,
    });

    // Verify status is from unified enum
    expect(Object.values(BtcActionStatus)).toContain(stake.status);
  });

  it('should have separate status, error, and loading concerns', () => {
    const config = createConfig({
      env: Env.testnet,
      providers: { evm: () => mockProvider },
    });

    const stake = btcStake(config, {
      assetOut: AssetId.LBTC,
      destChain: Chain.SEPOLIA,
    });

    // FAQ documents: orthogonal concerns
    // - status = What step are you at?
    // - error = Did something go wrong?
    // - isLoading = Is an operation in progress?

    expect(typeof stake.status).toBe('string');
    expect(stake.error === null || stake.error instanceof Error).toBe(true);
    expect(typeof stake.isLoading).toBe('boolean');
    expect(typeof stake.isFailed).toBe('boolean');

    // isFailed should be derived from error
    expect(stake.isFailed).toBe(stake.error !== null);
  });
});
