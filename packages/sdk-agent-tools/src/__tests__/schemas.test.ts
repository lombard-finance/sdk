import { describe, it, expect } from "vitest";

import {
  AddressAndChainSchema,
  StakeSchema,
  UnstakeSchema,
  DeployToVaultSchema,
  ExchangeRateSchema,
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

describe("ExchangeRateSchema", () => {
  it("has optional chainId (no required array)", () => {
    expect(ExchangeRateSchema.properties).toHaveProperty("chainId");
    expect(ExchangeRateSchema).not.toHaveProperty("required");
  });
});
