/**
 * BTC Deposit Integration Tests
 *
 * Tests BTC Deposit action with mocked API responses.
 *
 * @module __tests__/integration/btc-deposit.integration.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { btcDeposit } from '../../chains/btc/actions/deposit';
import { AssetId, Chain } from '../../index';
import { createTestConfig as createConfig } from '../helpers/createTestConfig';

// Mock EIP1193 Provider
const createMockProvider = () => ({
  // EIP-1193 event methods required by the EvmProvider type
  on: vi.fn(),
  removeListener: vi.fn(),
  request: vi.fn().mockImplementation(async ({ method }) => {
    switch (method) {
      case 'eth_chainId':
        return '0xa869'; // Avalanche Fuji
      case 'eth_accounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'];
      case 'personal_sign':
      case 'eth_signTypedData_v4':
        return '0xmocksignature';
      default:
        return null;
    }
  }),
});

describe('BTC Deposit Integration', () => {
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
  });

  describe('Action Creation', () => {
    it('should create BTC deposit action for Avalanche Fuji', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const deposit = btcDeposit(config, {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE_FUJI,
      });

      expect(deposit).toBeDefined();
      expect(deposit.status).toBe('idle');
    });

    it('should reject LBTC as output asset', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      expect(() => {
        btcDeposit(config, {
          assetOut: AssetId.LBTC,
          destChain: Chain.AVALANCHE_FUJI,
        });
      }).toThrow(/not supported for BTC deposits/);
    });
  });

  describe('Status Transitions', () => {
    it('should start in idle status', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const deposit = btcDeposit(config, {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE_FUJI,
      });

      expect(deposit.status).toBe('idle');
      expect(deposit.isLoading).toBe(false);
      expect(deposit.error).toBeNull();
    });
  });

  describe('Property Access', () => {
    it('should expose action params', () => {
      const config = createConfig({
        env: Env.testnet,
        providers: { evm: () => mockProvider },
      });

      const deposit = btcDeposit(config, {
        assetOut: AssetId.BTCb,
        destChain: Chain.AVALANCHE_FUJI,
      });

      expect(deposit.status).toBe('idle');
    });
  });
});

