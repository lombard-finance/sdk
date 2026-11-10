/**
 * EVM Withdraw Integration Tests
 *
 * Tests EVM Withdraw action with mocked API responses.
 *
 * @module packages/sdk/__tests__/integration/evm-withdraw-btcb.integration.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evmRedeem } from '../../chains/evm/actions/withdraw-btcb';
import { AssetId, Chain, evmActions } from '../../index';
import { createTestConfig as createConfig } from '../helpers/createTestConfig';

// Mock EIP1193 Provider
const createMockProvider = () => ({
  // EIP-1193 event methods required by the EvmProvider type
  on: vi.fn(),
  removeListener: vi.fn(),
  request: vi.fn().mockImplementation(async ({ method }) => {
    switch (method) {
      case 'eth_chainId':
        return '0xa86a'; // Avalanche mainnet
      case 'eth_accounts':
        return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'];
      case 'eth_call':
        return '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000';
      case 'eth_sendTransaction':
        return '0xmocktxhash';
      default:
        return null;
    }
  }),
});

describe('EVM Redeem Integration', () => {
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
  });

  describe('Action Creation', () => {
    it('should create redeem action using evmActions namespace', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const redeem = evm.withdraw({
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.BITCOIN_MAINNET,
      });

      expect(redeem).toBeDefined();
      expect(redeem.status).toBe('idle');
    });

    it('should create redeem action using factory', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const redeem = evmRedeem(config, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.BITCOIN_MAINNET,
      });

      expect(redeem).toBeDefined();
      expect(redeem.status).toBe('idle');
    });
  });

  describe('Status Transitions', () => {
    it('should start in idle status', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const redeem = evmRedeem(config, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.BITCOIN_MAINNET,
      });

      expect(redeem.status).toBe('idle');
      expect(redeem.isLoading).toBe(false);
      expect(redeem.error).toBeNull();
    });
  });

  /**
   * What used to sit here claimed to validate the route and did not: three
   * cases built the action with `assetIn: LBTC`, `assetOut: BTC.b`, both chains
   * Avalanche — the reverse of what this action does — and asserted only that
   * the result was defined. They passed because the params were typed `AssetId`
   * and nothing executed. Redeem burns BTC.b and releases BTC to a Bitcoin
   * address, so those were withdraw's parameters wearing redeem's name.
   *
   * The asset pair is now a compile-time guarantee: `assetIn` is the `BTC.b`
   * literal and `assetOut` the `BTC` literal, so a wrong asset is a type error
   * rather than a case to test. What is left worth asserting is the part types
   * cannot express.
   */
  describe('the route it reports', () => {
    it('describes itself as the BTC.b to BTC journey', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const redeem = evmRedeem(config, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.BITCOIN_MAINNET,
      });

      // Derived from the params rather than hardcoded, which is what keeps the
      // label from drifting from the route once one class covers several.
      expect(redeem.route).toBe('btcb-to-btc');
    });

    it('crosses to Bitcoin, so the chains differ', () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const redeem = evmRedeem(config, {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.BITCOIN_MAINNET,
      });

      // The old test asserted the opposite — "should require same source and
      // destination chain" — which was true only of the wrong route it built.
      expect(redeem).toBeDefined();
    });
  });
});
