import { describe, expect,it } from "vitest";

import {
  AddressAndChainSchema,
  BalanceSchema,
  DeployToVaultSchema,
  DepositBtcSchema,
  ExchangeRateSchema,
  StakeSchema,
  StrategiesSchema,
  UnstakeSchema,
} from "../schemas";

describe("AddressAndChainSchema", () => {
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

describe("StakeSchema", () => {
  it("requires amount and chainId", () => {
    expect(StakeSchema.required).toContain("amount");
    expect(StakeSchema.required).toContain("chainId");
  });
});

describe("UnstakeSchema", () => {
  it("requires amount, outputAsset, and chainId", () => {
    expect(UnstakeSchema.required).toContain("amount");
    expect(UnstakeSchema.required).toContain("outputAsset");
    expect(UnstakeSchema.required).toContain("chainId");
  });

  it("has a recipient property", () => {
    expect(UnstakeSchema.properties).toHaveProperty("recipient");
  });
});

describe("DeployToVaultSchema", () => {
  it("requires amount, protocol, and chainId", () => {
    expect(DeployToVaultSchema.required).toContain("amount");
    expect(DeployToVaultSchema.required).toContain("protocol");
    expect(DeployToVaultSchema.required).toContain("chainId");
  });
});

describe("BalanceSchema", () => {
  it("has address and chainId properties", () => {
    expect(BalanceSchema.type).toBe("object");
    expect(BalanceSchema.properties).toHaveProperty("address");
    expect(BalanceSchema.properties).toHaveProperty("chainId");
    expect(BalanceSchema.required).toContain("address");
    expect(BalanceSchema.required).toContain("chainId");
  });
});

describe("StrategiesSchema", () => {
  it("has optional chainId", () => {
    expect(StrategiesSchema.type).toBe("object");
    expect(StrategiesSchema.properties).toHaveProperty("chainId");
    expect((StrategiesSchema as Record<string, unknown>).required).toBeUndefined();
  });
});

describe("DepositBtcSchema", () => {
  it("requires address and chainId", () => {
    expect(DepositBtcSchema.type).toBe("object");
    expect(DepositBtcSchema.properties).toHaveProperty("address");
    expect(DepositBtcSchema.properties).toHaveProperty("chainId");
    expect(DepositBtcSchema.required).toContain("address");
    expect(DepositBtcSchema.required).toContain("chainId");
  });
});

describe("ExchangeRateSchema", () => {
  it("has optional chainId (no required array)", () => {
    expect(ExchangeRateSchema.properties).toHaveProperty("chainId");
    expect(ExchangeRateSchema).not.toHaveProperty("required");
  });
});
