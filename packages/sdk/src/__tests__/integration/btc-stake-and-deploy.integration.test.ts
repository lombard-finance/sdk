/**
 * BTC Stake And Deploy Integration Tests
 *
 * Tests BTC Stake And Deploy action with mocked API responses.
 *
 * @module __tests__/integration/btc-stake-and-deploy.integration.test.ts
 */

import { Env } from "@lombard.finance/sdk-common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { btcStakeAndDeploy } from "../../chains/btc/actions/stakeAndDeploy";
import { AssetId, Chain } from "../../index";
import { createTestConfig as createConfig } from "../helpers/createTestConfig";

// Mock EIP1193 Provider
const createMockProvider = () => ({
  // EIP-1193 event methods required by the EvmProvider type
  on: vi.fn(),
  removeListener: vi.fn(),
  request: vi.fn().mockImplementation(async ({ method }) => {
    switch (method) {
      case "eth_chainId":
        return "0x1"; // Ethereum mainnet
      case "eth_accounts":
        return ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"];
      case "personal_sign":
      case "eth_signTypedData_v4":
        return "0xmocksignature";
      default:
        return null;
    }
  }),
});

describe("BTC Stake And Deploy Integration", () => {
  let mockProvider: ReturnType<typeof createMockProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = createMockProvider();
  });

  describe("Action Creation", () => {
    it("should create stake and deploy action for Ethereum", () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const stakeAndDeploy = btcStakeAndDeploy(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
        protocol: "veda", // Use Veda protocol from DefiRegistry
      });

      expect(stakeAndDeploy).toBeDefined();
      expect(stakeAndDeploy.status).toBe("idle");
    });

    it("should reject BTCb as output asset", () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      expect(() => {
        btcStakeAndDeploy(config, {
          assetOut: AssetId.BTCb,
          destChain: Chain.ETHEREUM,
          protocol: "veda", // Use Veda protocol from DefiRegistry
        });
      }).toThrow(/not supported/);
    });
  });

  describe("Status Transitions", () => {
    it("should start in idle status", () => {
      const config = createConfig({
        env: Env.prod,
        providers: { evm: () => mockProvider },
      });

      const stakeAndDeploy = btcStakeAndDeploy(config, {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM,
        protocol: "veda", // Use Veda protocol from DefiRegistry
      });

      expect(stakeAndDeploy.status).toBe("idle");
      expect(stakeAndDeploy.isLoading).toBe(false);
      expect(stakeAndDeploy.error).toBeNull();
    });
  });
});
