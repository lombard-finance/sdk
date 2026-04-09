/**
 * AssetNamespace Tests
 *
 * Tests the new namespaced asset API
 */

import { Env } from "@lombard.finance/sdk-common";
import { describe, expect, it } from "vitest";

import { LombardSDK } from "../client/LombardSDK";
import { AssetId, Chain } from "../core";
import { createTestConfig } from "./helpers/createTestConfig";

describe("AssetNamespace", () => {
  describe("SDK Integration", () => {
    it("should be accessible via sdk.assets", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      expect(sdk.assets).toBeDefined();
    });

    it("should respect SDK environment", () => {
      const prodSdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const testnetSdk = new LombardSDK(createTestConfig({ env: Env.testnet }));

      const prodAddress = prodSdk.assets.getAddress(
        AssetId.LBTC,
        Chain.ETHEREUM,
      );
      const testnetAddress = testnetSdk.assets.getAddress(
        AssetId.LBTC,
        Chain.SEPOLIA,
      );

      expect(prodAddress).toBe("0x8236a87084f8b84306f72007f36f2618a5634494");
      expect(testnetAddress).toBe("0xc47e4b3124597fdf8dd07843d4a7052f2ee80c30");
    });
  });

  describe("getConfig", () => {
    it("should return config with specific type inference", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      expect(sdk.assets.getAddress(AssetId.LBTC, Chain.ETHEREUM)).toBe(
        "0x8236a87084f8b84306f72007f36f2618a5634494",
      );
      expect(sdk.assets.getDecimals(AssetId.LBTC)).toBe(8);
      // EVM chains don't use asset router - only Starknet does
      expect(sdk.assets.usesAssetRouter(AssetId.LBTC, Chain.ETHEREUM)).toBe(
        false,
      );
    });

    it("should return undefined for non-deployed asset", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      expect(
        sdk.assets.getAddress(AssetId.LBTC, Chain.SEPOLIA),
      ).toBeUndefined();
    });
  });

  describe("getAddress", () => {
    it("should return token address", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const address = sdk.assets.getAddress(AssetId.LBTC, Chain.ETHEREUM);

      expect(address).toBe("0x8236a87084f8b84306f72007f36f2618a5634494");
    });

    it("should return undefined for non-deployed asset", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const address = sdk.assets.getAddress(AssetId.LBTC, Chain.SEPOLIA);

      expect(address).toBeUndefined();
    });
  });

  describe("getDecimals", () => {
    it("should return token decimals", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      expect(sdk.assets.getDecimals(AssetId.LBTC)).toBe(8);
    });

    it("should return 8 for non-deployed asset (default)", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      expect(sdk.assets.getDecimals(AssetId.LBTC)).toBe(8);
    });
  });

  describe("usesAssetRouter", () => {
    it("should return true for LBTC on Starknet (has asset router)", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const usesRouter = sdk.assets.usesAssetRouter(
        AssetId.LBTC,
        Chain.STARKNET_MAINNET,
      );

      expect(usesRouter).toBe(true);
    });

    it("should return false for LBTC on Ethereum (no asset router)", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const usesRouter = sdk.assets.usesAssetRouter(
        AssetId.LBTC,
        Chain.ETHEREUM,
      );

      expect(usesRouter).toBe(false);
    });
  });

  describe("getAssetRouter", () => {
    it("should return asset router for Starknet mainnet", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const router = sdk.assets.getAssetRouter(
        AssetId.LBTC,
        Chain.STARKNET_MAINNET,
      );

      expect(router).toBe(
        "0x05b1886d0f844ab930fc0ee066f1655a873437f15a5d2c41ee3e884fd5299976",
      );
    });

    it("should return undefined for EVM chains", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const router = sdk.assets.getAssetRouter(AssetId.LBTC, Chain.ETHEREUM);

      expect(router).toBeUndefined();
    });
  });

  describe("getBridgeAdapter", () => {
    it("should return bridge adapter for BTCb on Avalanche Fuji", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.dev }));
      const adapter = sdk.assets.getBridgeAdapter(
        AssetId.BTCb,
        Chain.AVALANCHE_FUJI,
      );

      expect(adapter).toBe("0x0A65C37d07c32E5eA8ea40495b7f249cdE26935e");
    });

    it("should return undefined for assets without bridge adapter", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const adapter = sdk.assets.getBridgeAdapter(AssetId.LBTC, Chain.ETHEREUM);

      expect(adapter).toBeUndefined();
    });
  });

  describe("getByAddress", () => {
    it("should find asset by address (reverse lookup)", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const asset = sdk.assets.getByAddress(
        "0x8236a87084f8b84306f72007f36f2618a5634494",
        Chain.ETHEREUM,
      );

      expect(asset).toBe(AssetId.LBTC);
    });

    it("should return undefined for unknown address", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const asset = sdk.assets.getByAddress("0x1234567890", Chain.ETHEREUM);

      expect(asset).toBeUndefined();
    });
  });

  describe("isDeployed", () => {
    it("should return true for deployed asset", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const deployed = sdk.assets.isDeployed(AssetId.LBTC, Chain.ETHEREUM);

      expect(deployed).toBe(true);
    });

    it("should return false for non-deployed asset", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const deployed = sdk.assets.isDeployed(AssetId.LBTC, Chain.SEPOLIA);

      expect(deployed).toBe(false);
    });
  });

  describe("getChains", () => {
    it("should return all chains where LBTC is deployed in prod", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const chains = sdk.assets.getChains(AssetId.LBTC);

      expect(chains).toContain(Chain.ETHEREUM);
      expect(chains).toContain(Chain.BASE);
      expect(chains).toContain(Chain.BSC);
      expect(chains).toContain(Chain.SOLANA_MAINNET);
      expect(chains.length).toBeGreaterThan(5);
    });
  });

  describe("getEnvironments", () => {
    it("should return all environments where LBTC is deployed on Ethereum", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const envs = sdk.assets.getEnvironments(AssetId.LBTC, Chain.ETHEREUM);

      expect(envs).toContain(Env.prod);
      expect(envs.length).toBe(1); // Only prod on Ethereum mainnet
    });

    it("should return multiple environments for Sepolia", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const envs = sdk.assets.getEnvironments(AssetId.LBTC, Chain.SEPOLIA);

      expect(envs).toContain(Env.testnet);
      expect(envs).toContain(Env.stage);
      expect(envs).toContain(Env.dev);
    });
  });

  describe("registry", () => {
    it("should provide direct registry access", () => {
      const sdk = new LombardSDK(createTestConfig({ env: Env.prod }));
      const catalog = sdk.assets.getCatalog();

      // Catalog structure: { version, assets: { [AssetId]: AssetEntry } }
      expect(catalog.version).toBeDefined();
      expect(catalog.assets).toBeDefined();
      expect(Object.keys(catalog.assets)).toContain(AssetId.LBTC);

      const asset = catalog.assets[AssetId.LBTC];
      expect(asset).toBeDefined();
      expect(asset?.decimals).toBe(8);
      expect(asset?.deployments).toBeDefined();
      expect(asset?.deployments.length).toBeGreaterThan(0);
    });
  });
});
