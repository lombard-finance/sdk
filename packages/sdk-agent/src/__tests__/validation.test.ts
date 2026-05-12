import { Env } from "@lombard.finance/sdk";
import { describe, expect, it } from "vitest";

import {
  isBitcoinAddress,
  isPositiveAmount,
  resolvePartnerId,
  validateAmountInputs,
  validateStakeInputs,
  validateUnstakeInputs,
} from "../validation";

const MAINNET_CHAIN_ID = 1;
const SEPOLIA_CHAIN_ID = 11155111;
const BASE_SEPOLIA_CHAIN_ID = 84532;

const MAINNET_BECH32 = "bc1q9zpgru5xkx4ekzgdsv9zg9pe6ye2qu5jq3jukx";
const MAINNET_P2PKH = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const MAINNET_P2SH = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy";
const TESTNET_BECH32 = "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3";
const TESTNET_P2PKH = "mzBc4XEFSdzCDcTxAgf6EZXgsZWpztRhef";
const TESTNET_P2SH = "2N2JD6wb56AfK4tfmM6PwdVmoYk2dCKf4Br";

describe("isBitcoinAddress", () => {
  it("accepts mainnet bech32 / p2pkh / p2sh on mainnet chains", () => {
    expect(isBitcoinAddress(MAINNET_BECH32, MAINNET_CHAIN_ID)).toBe(true);
    expect(isBitcoinAddress(MAINNET_P2PKH, MAINNET_CHAIN_ID)).toBe(true);
    expect(isBitcoinAddress(MAINNET_P2SH, MAINNET_CHAIN_ID)).toBe(true);
  });

  it("accepts testnet bech32 / p2pkh / p2sh on testnet chains", () => {
    expect(isBitcoinAddress(TESTNET_BECH32, SEPOLIA_CHAIN_ID)).toBe(true);
    expect(isBitcoinAddress(TESTNET_P2PKH, SEPOLIA_CHAIN_ID)).toBe(true);
    expect(isBitcoinAddress(TESTNET_P2SH, BASE_SEPOLIA_CHAIN_ID)).toBe(true);
  });

  it("rejects mainnet addresses on testnet chains and vice versa", () => {
    expect(isBitcoinAddress(MAINNET_BECH32, SEPOLIA_CHAIN_ID)).toBe(false);
    expect(isBitcoinAddress(TESTNET_BECH32, MAINNET_CHAIN_ID)).toBe(false);
  });

  it("rejects EVM addresses, numbers, and empty strings", () => {
    expect(
      isBitcoinAddress("0x1234567890abcdef1234567890abcdef12345678", MAINNET_CHAIN_ID),
    ).toBe(false);
    expect(isBitcoinAddress("0.0000001", MAINNET_CHAIN_ID)).toBe(false);
    expect(isBitcoinAddress("", MAINNET_CHAIN_ID)).toBe(false);
    expect(isBitcoinAddress("   ", MAINNET_CHAIN_ID)).toBe(false);
  });

  it("rejects non-string inputs", () => {
    // Type coercion guard
    expect(isBitcoinAddress(null as unknown as string, MAINNET_CHAIN_ID)).toBe(false);
    expect(isBitcoinAddress(undefined as unknown as string, MAINNET_CHAIN_ID)).toBe(false);
    expect(isBitcoinAddress(42 as unknown as string, MAINNET_CHAIN_ID)).toBe(false);
  });
});

describe("isPositiveAmount", () => {
  it("accepts positive numeric strings", () => {
    expect(isPositiveAmount("0.5")).toBe(true);
    expect(isPositiveAmount("1")).toBe(true);
    expect(isPositiveAmount("0.0001")).toBe(true);
  });

  it("rejects zero, negatives, and non-numeric strings", () => {
    expect(isPositiveAmount("0")).toBe(false);
    expect(isPositiveAmount("-1")).toBe(false);
    expect(isPositiveAmount("abc")).toBe(false);
    expect(isPositiveAmount("0.5.5")).toBe(false);
    expect(isPositiveAmount("")).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(isPositiveAmount(0.5)).toBe(false);
    expect(isPositiveAmount(null)).toBe(false);
    expect(isPositiveAmount(undefined)).toBe(false);
  });
});

describe("validateUnstakeInputs", () => {
  it("returns valid for a well-formed LBTC → BTC unstake", () => {
    const result = validateUnstakeInputs({
      amount: "0.5",
      outputAsset: "BTC",
      recipient: MAINNET_BECH32,
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result.valid).toBe(true);
  });

  it("returns valid for a well-formed LBTC → BTC.b unstake (no recipient needed)", () => {
    const result = validateUnstakeInputs({
      amount: "0.5",
      outputAsset: "BTCb",
      recipient: undefined,
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result.valid).toBe(true);
  });

  it("flags missing recipient on BTC output", () => {
    const result = validateUnstakeInputs({
      amount: "0.5",
      outputAsset: "BTC",
      recipient: undefined,
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missing).toContain("recipient");
      expect(result.note).toMatch(/Ask the user/i);
    }
  });

  it("flags invalid recipient (numeric string) on BTC output", () => {
    const result = validateUnstakeInputs({
      amount: "0.5",
      outputAsset: "BTC",
      recipient: "0.0000001",
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.join(" ")).toMatch(/valid Bitcoin address/i);
    }
  });

  it("flags testnet recipient on mainnet chain", () => {
    const result = validateUnstakeInputs({
      amount: "0.5",
      outputAsset: "BTC",
      recipient: TESTNET_BECH32,
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result.valid).toBe(false);
  });

  it("flags below-minimum amount", () => {
    const result = validateUnstakeInputs({
      amount: "0.0000001",
      outputAsset: "BTCb",
      recipient: undefined,
      chainId: SEPOLIA_CHAIN_ID,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.join(" ")).toMatch(/minimum/i);
    }
  });

  it("flags invalid outputAsset", () => {
    const result = validateUnstakeInputs({
      amount: "0.5",
      outputAsset: "ETH",
      recipient: undefined,
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result.valid).toBe(false);
  });

  it("collects multiple failures in one pass", () => {
    const result = validateUnstakeInputs({
      amount: "0.0000001",
      outputAsset: "BTC",
      recipient: "not-an-address",
      chainId: MAINNET_CHAIN_ID,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      // both the amount-below-minimum error and the invalid-recipient error
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("validateStakeInputs", () => {
  it("returns valid for an amount above minimum", () => {
    expect(validateStakeInputs({ amount: "0.5" }).valid).toBe(true);
  });

  it("rejects below-minimum amount", () => {
    const result = validateStakeInputs({ amount: "0.00001" });
    expect(result.valid).toBe(false);
  });

  it("rejects non-numeric amount", () => {
    const result = validateStakeInputs({ amount: "abc" });
    expect(result.valid).toBe(false);
  });
});

describe("validateAmountInputs", () => {
  it("returns valid for a positive numeric amount", () => {
    expect(validateAmountInputs({ amount: "0.1" }).valid).toBe(true);
  });

  it("rejects zero amounts", () => {
    expect(validateAmountInputs({ amount: "0" }).valid).toBe(false);
  });
});

describe("resolvePartnerId", () => {
  it("returns 'test1' on testnet when nothing is configured", () => {
    expect(resolvePartnerId(Env.testnet, undefined)).toBe("test1");
  });

  it("returns undefined on prod when nothing is configured", () => {
    expect(resolvePartnerId(Env.prod, undefined)).toBeUndefined();
  });

  it("honors an explicitly configured partner ID on prod", () => {
    expect(resolvePartnerId(Env.prod, "custom-partner")).toBe("custom-partner");
  });

  it("honors an explicitly configured partner ID on testnet (override)", () => {
    expect(resolvePartnerId(Env.testnet, "different-test-partner")).toBe(
      "different-test-partner",
    );
  });
});
