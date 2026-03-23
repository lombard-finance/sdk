import type { Network } from "@coinbase/agentkit";
import { ChainId } from "@lombard.finance/sdk";
import { Env } from "@lombard.finance/sdk-common";
import { describe, expect, it } from "vitest";

import {
  isLombardSupportedNetwork,
  resolveChainName,
  resolveNetwork,
} from "../networks";

function makeNetwork(networkId?: string, chainId?: string): Network {
  return {
    protocolFamily: "evm",
    networkId,
    chainId,
  };
}

describe("resolveNetwork", () => {
  it("resolves ethereum-mainnet", () => {
    const result = resolveNetwork(makeNetwork("ethereum-mainnet"));
    expect(result).toEqual({
      chainId: ChainId.ethereum,
      env: Env.prod,
      networkId: "ethereum-mainnet",
    });
  });

  it("resolves ethereum-sepolia", () => {
    const result = resolveNetwork(makeNetwork("ethereum-sepolia"));
    expect(result).toEqual({
      chainId: ChainId.sepolia,
      env: Env.testnet,
      networkId: "ethereum-sepolia",
    });
  });

  it("resolves base-mainnet", () => {
    const result = resolveNetwork(makeNetwork("base-mainnet"));
    expect(result).toEqual({
      chainId: ChainId.base,
      env: Env.prod,
      networkId: "base-mainnet",
    });
  });

  it("resolves base-sepolia", () => {
    const result = resolveNetwork(makeNetwork("base-sepolia"));
    expect(result).toEqual({
      chainId: ChainId.baseSepoliaTestnet,
      env: Env.testnet,
      networkId: "base-sepolia",
    });
  });

  it("returns null for unsupported networks", () => {
    expect(resolveNetwork(makeNetwork("polygon-mainnet"))).toBeNull();
    expect(resolveNetwork(makeNetwork("arbitrum-mainnet"))).toBeNull();
    expect(resolveNetwork(makeNetwork("solana-mainnet"))).toBeNull();
  });

  it("returns null when networkId is missing", () => {
    expect(resolveNetwork(makeNetwork(undefined))).toBeNull();
  });
});

describe("resolveChainName", () => {
  it("resolves full network IDs", () => {
    expect(resolveChainName("ethereum-mainnet")).toEqual({
      chainId: ChainId.ethereum,
      env: Env.prod,
      networkId: "ethereum-mainnet",
    });
  });

  it("resolves friendly aliases", () => {
    expect(resolveChainName("ethereum")?.chainId).toBe(ChainId.ethereum);
    expect(resolveChainName("eth")?.chainId).toBe(ChainId.ethereum);
    expect(resolveChainName("mainnet")?.chainId).toBe(ChainId.ethereum);
    expect(resolveChainName("sepolia")?.chainId).toBe(ChainId.sepolia);
    expect(resolveChainName("base")?.chainId).toBe(ChainId.base);
  });

  it("is case-insensitive", () => {
    expect(resolveChainName("ETHEREUM-MAINNET")?.chainId).toBe(
      ChainId.ethereum,
    );
    expect(resolveChainName("Base")?.chainId).toBe(ChainId.base);
  });

  it("trims whitespace", () => {
    expect(resolveChainName("  ethereum  ")?.chainId).toBe(ChainId.ethereum);
  });

  it("returns null for unknown chains", () => {
    expect(resolveChainName("polygon")).toBeNull();
    expect(resolveChainName("unknown")).toBeNull();
    expect(resolveChainName("")).toBeNull();
  });
});

describe("isLombardSupportedNetwork", () => {
  it("returns true for supported networks", () => {
    expect(isLombardSupportedNetwork(makeNetwork("ethereum-mainnet"))).toBe(
      true,
    );
    expect(isLombardSupportedNetwork(makeNetwork("base-sepolia"))).toBe(true);
  });

  it("returns false for unsupported networks", () => {
    expect(isLombardSupportedNetwork(makeNetwork("polygon-mainnet"))).toBe(
      false,
    );
    expect(isLombardSupportedNetwork(makeNetwork(undefined))).toBe(false);
  });
});
