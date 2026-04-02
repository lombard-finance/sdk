import { describe, it, expect } from "vitest";

import { getChainConfig, SUPPORTED_CHAINS } from "../chains";

describe("getChainConfig", () => {
  it.each([
    [1, "Ethereum"],
    [11155111, "Sepolia"],
    [8453, "Base"],
    [84532, "Base Sepolia"],
  ])("returns correct config for chain ID %i (%s)", (chainId, expectedName) => {
    const config = getChainConfig(chainId);
    expect(config.name).toBe(expectedName);
    expect(config).toHaveProperty("chain");
    expect(config).toHaveProperty("chainId");
    expect(config).toHaveProperty("env");
    expect(config).toHaveProperty("name");
  });

  it("throws for unsupported chain ID", () => {
    expect(() => getChainConfig(999)).toThrow("Unsupported chain ID: 999");
  });

  it("each config has chain, chainId, env, and name properties", () => {
    for (const config of Object.values(SUPPORTED_CHAINS)) {
      expect(config).toHaveProperty("chain");
      expect(config).toHaveProperty("chainId");
      expect(config).toHaveProperty("env");
      expect(config).toHaveProperty("name");
    }
  });
});
