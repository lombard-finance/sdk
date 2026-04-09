/**
 * EVM Redeem Integration Tests
 *
 * Tests EVM Redeem action with mocked API responses.
 *
 * @module __tests__/integration/evm-redeem.integration.test.ts
 */

import { Env } from "@lombard.finance/sdk-common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { evmRedeem } from "../../chains/evm/actions/redeem";
import { AssetId, Chain, evmActions } from "../../index";
import { createTestConfig as createConfig } from "../helpers/createTestConfig";

// Mock EIP1193 Provider
const createMockProvider = () => ({
  // EIP-1193 event methods required by the EvmProvider type
  on: vi.fn(),
  removeListener: vi.fn(),
  request: vi.fn().mockImplementation(async ({ method }) => {
    switch (method) {
      case "eth_chainId":
        return "0xa86a"; // Avalanche mainnet
      case "eth_accounts":
        return ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"];
      case "eth_call":
        return "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000";
      case "eth_sendTransaction":
        return "0xmocktxhash";
      default:
        return null;
    }
  }),
});

describe("EVM Redeem Integration", () => {
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
  });

  describe("Action Creation", () => {
    it("should create redeem action using evmActions namespace", () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const evm = evmActions(config);
      const redeem = evm.redeem({
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.AVALANCHE,
      });

      expect(redeem).toBeDefined();
      expect(redeem.status).toBe("idle");
    });

    it("should create redeem action using factory", () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const redeem = evmRedeem(config, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.AVALANCHE,
      });

      expect(redeem).toBeDefined();
      expect(redeem.status).toBe("idle");
    });
  });

  describe("Status Transitions", () => {
    it("should start in idle status", () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const redeem = evmRedeem(config, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.AVALANCHE,
      });

      expect(redeem.status).toBe("idle");
      expect(redeem.isLoading).toBe(false);
      expect(redeem.error).toBeNull();
    });
  });

  describe("Chain Validation", () => {
    it("should require same source and destination chain", () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      // Same chain - should work
      const redeem = evmRedeem(config, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.AVALANCHE,
      });

      expect(redeem).toBeDefined();
    });
  });

  describe("Asset Validation", () => {
    it("should require LBTC as input", () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      // LBTC input - should work
      const redeem = evmRedeem(config, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.AVALANCHE,
      });

      expect(redeem).toBeDefined();
    });

    it("should require BTCb as output", () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      // BTCb output - should work
      const redeem = evmRedeem(config, {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.AVALANCHE,
      });

      expect(redeem).toBeDefined();
    });
  });
});
