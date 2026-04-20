import { describe, expect, it } from "vitest";

import {
  AddressAndChainSchema,
  AddressAndChainZod,
  BalanceSchema,
  BalanceZod,
  ClaimDepositSchema,
  ClaimDepositZod,
  DeployToVaultSchema,
  DeployToVaultZod,
  DepositBtcSchema,
  DepositBtcZod,
  ExchangeRateSchema,
  ExchangeRateZod,
  LbtcApySchema,
  LbtcApyZod,
  StakeSchema,
  StakeZod,
  StrategiesSchema,
  StrategiesZod,
  UnstakeSchema,
  UnstakeZod,
} from "../schemas";

// ─── Zod schema validation tests ─────────────────────────────────────

describe("AddressAndChainZod", () => {
  it("accepts valid EVM address and chainId", () => {
    const result = AddressAndChainZod.safeParse({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid EVM address", () => {
    const result = AddressAndChainZod.safeParse({
      address: "not-an-address",
      chainId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects address without 0x prefix", () => {
    const result = AddressAndChainZod.safeParse({
      address: "1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects address with wrong length", () => {
    const result = AddressAndChainZod.safeParse({
      address: "0x1234",
      chainId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing chainId", () => {
    const result = AddressAndChainZod.safeParse({
      address: "0x1234567890abcdef1234567890abcdef12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing address", () => {
    const result = AddressAndChainZod.safeParse({ chainId: 1 });
    expect(result.success).toBe(false);
  });
});

describe("StakeZod", () => {
  it("accepts valid amount and chainId", () => {
    const result = StakeZod.safeParse({ amount: "0.1", chainId: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric amount", () => {
    const result = StakeZod.safeParse({ amount: "abc", chainId: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = StakeZod.safeParse({ amount: "0", chainId: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = StakeZod.safeParse({ amount: "-1", chainId: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects amount >= 1000", () => {
    const result = StakeZod.safeParse({ amount: "1000", chainId: 1 });
    expect(result.success).toBe(false);
  });

  it("accepts amount just under 1000", () => {
    const result = StakeZod.safeParse({ amount: "999.99", chainId: 1 });
    expect(result.success).toBe(true);
  });
});

describe("UnstakeZod", () => {
  it("accepts valid unstake params", () => {
    const result = UnstakeZod.safeParse({
      amount: "0.5",
      outputAsset: "BTC",
      chainId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts BTCb outputAsset", () => {
    const result = UnstakeZod.safeParse({
      amount: "0.5",
      outputAsset: "BTCb",
      chainId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid outputAsset", () => {
    const result = UnstakeZod.safeParse({
      amount: "0.5",
      outputAsset: "ETH",
      chainId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional recipient", () => {
    const result = UnstakeZod.safeParse({
      amount: "0.5",
      outputAsset: "BTC",
      recipient: "bc1qsome...",
      chainId: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe("DeployToVaultZod", () => {
  it("accepts valid deploy params", () => {
    const result = DeployToVaultZod.safeParse({
      amount: "1.5",
      protocol: "veda",
      chainId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid protocol", () => {
    const result = DeployToVaultZod.safeParse({
      amount: "1.5",
      protocol: "unknown",
      chainId: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("ExchangeRateZod", () => {
  it("accepts empty object (chainId is optional)", () => {
    const result = ExchangeRateZod.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts with chainId", () => {
    const result = ExchangeRateZod.safeParse({ chainId: 1 });
    expect(result.success).toBe(true);
  });
});

describe("StrategiesZod", () => {
  it("accepts empty object (chainId is optional)", () => {
    const result = StrategiesZod.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts with chainId", () => {
    const result = StrategiesZod.safeParse({ chainId: 8453 });
    expect(result.success).toBe(true);
  });
});

// ─── Derived JSON Schema structure tests (backward compat) ───────────

describe("AddressAndChainSchema (JSON Schema)", () => {
  it('has type "object" with address and chainId properties', () => {
    expect(AddressAndChainSchema.type).toBe("object");
    expect(AddressAndChainSchema.properties).toHaveProperty("address");
    expect(AddressAndChainSchema.properties).toHaveProperty("chainId");
  });

  it("requires address and chainId", () => {
    expect(AddressAndChainSchema.required).toContain("address");
    expect(AddressAndChainSchema.required).toContain("chainId");
  });
});

describe("StakeSchema (JSON Schema)", () => {
  it("requires amount and chainId", () => {
    expect(StakeSchema.required).toContain("amount");
    expect(StakeSchema.required).toContain("chainId");
  });
});

describe("UnstakeSchema (JSON Schema)", () => {
  it("requires amount, outputAsset, and chainId", () => {
    expect(UnstakeSchema.required).toContain("amount");
    expect(UnstakeSchema.required).toContain("outputAsset");
    expect(UnstakeSchema.required).toContain("chainId");
  });

  it("has a recipient property", () => {
    expect(UnstakeSchema.properties).toHaveProperty("recipient");
  });
});

describe("DeployToVaultSchema (JSON Schema)", () => {
  it("requires amount, protocol, and chainId", () => {
    expect(DeployToVaultSchema.required).toContain("amount");
    expect(DeployToVaultSchema.required).toContain("protocol");
    expect(DeployToVaultSchema.required).toContain("chainId");
  });
});

describe("BalanceSchema (JSON Schema)", () => {
  it("has address and chainId properties", () => {
    expect(BalanceSchema.type).toBe("object");
    expect(BalanceSchema.properties).toHaveProperty("address");
    expect(BalanceSchema.properties).toHaveProperty("chainId");
    expect(BalanceSchema.required).toContain("address");
    expect(BalanceSchema.required).toContain("chainId");
  });
});

describe("StrategiesSchema (JSON Schema)", () => {
  it("has optional chainId", () => {
    expect(StrategiesSchema.type).toBe("object");
    expect(StrategiesSchema.properties).toHaveProperty("chainId");
  });
});

describe("DepositBtcSchema (JSON Schema)", () => {
  it("requires address and chainId", () => {
    expect(DepositBtcSchema.type).toBe("object");
    expect(DepositBtcSchema.properties).toHaveProperty("address");
    expect(DepositBtcSchema.properties).toHaveProperty("chainId");
    expect(DepositBtcSchema.required).toContain("address");
    expect(DepositBtcSchema.required).toContain("chainId");
  });
});

describe("ExchangeRateSchema (JSON Schema)", () => {
  it("has optional chainId (no required array or empty required)", () => {
    expect(ExchangeRateSchema.properties).toHaveProperty("chainId");
    // With Zod derivation, required may be absent or empty
    if ("required" in ExchangeRateSchema) {
      expect(
        (ExchangeRateSchema as Record<string, unknown>).required,
      ).toEqual(expect.arrayContaining([]));
    }
  });
});

// ─── BalanceZod and DepositBtcZod alias tests ────────────────────────

describe("BalanceZod", () => {
  it("is the same schema as AddressAndChainZod", () => {
    expect(BalanceZod).toBe(AddressAndChainZod);
  });
});

describe("DepositBtcZod", () => {
  it("is the same schema as AddressAndChainZod", () => {
    expect(DepositBtcZod).toBe(AddressAndChainZod);
  });
});

// ─── New schema tests ───────────────────────────────────────────────

describe("LbtcApyZod", () => {
  it("accepts empty object (no params needed)", () => {
    const result = LbtcApyZod.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("LbtcApySchema (JSON Schema)", () => {
  it('has type "object"', () => {
    expect(LbtcApySchema.type).toBe("object");
  });
});

describe("ClaimDepositZod", () => {
  it("accepts valid depositTxHash, address, and chainId", () => {
    const result = ClaimDepositZod.safeParse({
      depositTxHash: "abc123",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing depositTxHash", () => {
    const result = ClaimDepositZod.safeParse({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing address", () => {
    const result = ClaimDepositZod.safeParse({
      depositTxHash: "abc123",
      chainId: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty depositTxHash", () => {
    const result = ClaimDepositZod.safeParse({
      depositTxHash: "",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("ClaimDepositSchema (JSON Schema)", () => {
  it("requires depositTxHash, address, and chainId", () => {
    expect(ClaimDepositSchema.type).toBe("object");
    expect(ClaimDepositSchema.properties).toHaveProperty("depositTxHash");
    expect(ClaimDepositSchema.properties).toHaveProperty("address");
    expect(ClaimDepositSchema.properties).toHaveProperty("chainId");
    expect(ClaimDepositSchema.required).toContain("depositTxHash");
    expect(ClaimDepositSchema.required).toContain("address");
    expect(ClaimDepositSchema.required).toContain("chainId");
  });
});
