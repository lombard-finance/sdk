import { describe, expect, it } from "vitest";

import {
  ClaimDepositSchema,
  DeployToDefiSchema,
  GetBtcbBalanceSchema,
  GetDepositStatusSchema,
  GetLbtcBalanceSchema,
  GetLbtcExchangeRateSchema,
  GetUnstakeStatusSchema,
  RedeemLbtcToBtcbSchema,
  StakeBtcbToLbtcSchema,
  UnstakeLbtcSchema,
} from "../schemas";

describe("StakeBtcbToLbtcSchema", () => {
  it("accepts valid input", () => {
    const result = StakeBtcbToLbtcSchema.safeParse({ amount: "0.1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing amount", () => {
    const result = StakeBtcbToLbtcSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string amount", () => {
    const result = StakeBtcbToLbtcSchema.safeParse({ amount: 0.1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric amount", () => {
    const result = StakeBtcbToLbtcSchema.safeParse({ amount: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = StakeBtcbToLbtcSchema.safeParse({ amount: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = StakeBtcbToLbtcSchema.safeParse({ amount: "-1" });
    expect(result.success).toBe(false);
  });

  it("rejects amount >= 1000 BTC", () => {
    const result = StakeBtcbToLbtcSchema.safeParse({ amount: "1000" });
    expect(result.success).toBe(false);
  });

  it("accepts amount just under 1000", () => {
    const result = StakeBtcbToLbtcSchema.safeParse({ amount: "999.99" });
    expect(result.success).toBe(true);
  });
});

describe("UnstakeLbtcSchema", () => {
  it("accepts valid BTC unstake", () => {
    const result = UnstakeLbtcSchema.safeParse({
      amount: "0.1",
      recipient: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      outputAsset: "BTC",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid BTCb unstake", () => {
    const result = UnstakeLbtcSchema.safeParse({
      amount: "0.1",
      recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      outputAsset: "BTCb",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid outputAsset", () => {
    const result = UnstakeLbtcSchema.safeParse({
      amount: "0.1",
      recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      outputAsset: "ETH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing recipient", () => {
    const result = UnstakeLbtcSchema.safeParse({
      amount: "0.1",
      outputAsset: "BTC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid recipient address", () => {
    const result = UnstakeLbtcSchema.safeParse({
      amount: "0.1",
      recipient: "not-an-address",
      outputAsset: "BTCb",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric amount", () => {
    const result = UnstakeLbtcSchema.safeParse({
      amount: "lots",
      recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      outputAsset: "BTCb",
    });
    expect(result.success).toBe(false);
  });

  it("rejects amount >= 1000 BTC", () => {
    const result = UnstakeLbtcSchema.safeParse({
      amount: "1500",
      recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      outputAsset: "BTCb",
    });
    expect(result.success).toBe(false);
  });
});

describe("RedeemLbtcToBtcbSchema", () => {
  it("accepts valid input", () => {
    const result = RedeemLbtcToBtcbSchema.safeParse({ amount: "1.5" });
    expect(result.success).toBe(true);
  });

  it("rejects missing amount", () => {
    const result = RedeemLbtcToBtcbSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("DeployToDefiSchema", () => {
  it("accepts valid deployment", () => {
    const result = DeployToDefiSchema.safeParse({
      amount: "0.5",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = DeployToDefiSchema.safeParse({
      amount: "-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("ClaimDepositSchema", () => {
  it("accepts valid tx hash", () => {
    const result = ClaimDepositSchema.safeParse({
      depositTxHash: "0xabc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing tx hash", () => {
    const result = ClaimDepositSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("GetLbtcBalanceSchema", () => {
  it("accepts with address", () => {
    const result = GetLbtcBalanceSchema.safeParse({
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    });
    expect(result.success).toBe(true);
  });

  it("accepts without address (optional)", () => {
    const result = GetLbtcBalanceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid EVM address", () => {
    const result = GetLbtcBalanceSchema.safeParse({ address: "not-an-address" });
    expect(result.success).toBe(false);
  });
});

describe("GetBtcbBalanceSchema", () => {
  it("accepts without address", () => {
    const result = GetBtcbBalanceSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects invalid EVM address", () => {
    const result = GetBtcbBalanceSchema.safeParse({ address: "0xshort" });
    expect(result.success).toBe(false);
  });
});

describe("GetLbtcExchangeRateSchema", () => {
  it("accepts empty object", () => {
    const result = GetLbtcExchangeRateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("GetDepositStatusSchema", () => {
  it("accepts with optional address", () => {
    expect(GetDepositStatusSchema.safeParse({}).success).toBe(true);
    expect(
      GetDepositStatusSchema.safeParse({
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      }).success,
    ).toBe(true);
  });
});

describe("GetUnstakeStatusSchema", () => {
  it("accepts with optional address", () => {
    expect(GetUnstakeStatusSchema.safeParse({}).success).toBe(true);
    expect(
      GetUnstakeStatusSchema.safeParse({
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      }).success,
    ).toBe(true);
  });
});
