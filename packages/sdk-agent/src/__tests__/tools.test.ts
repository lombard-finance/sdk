import { describe, expect, it, vi } from "vitest";

import {
  allTools,
  checkFeeAuthorization,
  getBalance,
  getDepositBtcAddress,
  getExchangeRate,
  getLbtcApy,
  getStrategies,
  getVaultPositions,
  prepareBtcDeposit,
  prepareClaimDeposit,
  toolsByName,
} from "../tools";

vi.mock("@lombard.finance/sdk", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@lombard.finance/sdk",
  );
  return {
    ...actual,
    getExchangeRatio: vi.fn().mockResolvedValue({
      LBTC: { BTCTokenRatio: 1.001, tokenBTCRatio: 0.999 },
    }),
    getLBTCExchangeRate: vi.fn().mockResolvedValue({
      exchangeRate: 1,
      minAmount: 100000,
    }),
  };
});

describe("getBalance", () => {
  it("has correct name and schema", () => {
    expect(getBalance.name).toBe("get_balance");
    expect(getBalance.parameters).toHaveProperty("properties");
    expect(typeof getBalance.execute).toBe("function");
  });
});

describe("getStrategies", () => {
  it("has correct name and schema", () => {
    expect(getStrategies.name).toBe("get_strategies");
    expect(typeof getStrategies.execute).toBe("function");
  });
});

describe("getDepositBtcAddress", () => {
  it("has correct name and schema", () => {
    expect(getDepositBtcAddress.name).toBe("get_deposit_btc_address");
    expect(typeof getDepositBtcAddress.execute).toBe("function");
  });
});

describe("checkFeeAuthorization", () => {
  it("has correct name and schema", () => {
    expect(checkFeeAuthorization.name).toBe("check_fee_authorization");
    expect(checkFeeAuthorization.parameters).toHaveProperty("properties");
    expect(typeof checkFeeAuthorization.execute).toBe("function");
  });
});

describe("prepareBtcDeposit", () => {
  it("has correct name and schema", () => {
    expect(prepareBtcDeposit.name).toBe("prepare_btc_deposit");
    expect(prepareBtcDeposit.parameters).toHaveProperty("properties");
    expect(typeof prepareBtcDeposit.execute).toBe("function");
  });

  it("returns sdk_execute action with btc.generateDepositAddress method", async () => {
    const result = await prepareBtcDeposit.execute({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chainId: 1,
    });
    expect(result).toHaveProperty("action", "sdk_execute");
    expect(result).toHaveProperty("method", "btc.generateDepositAddress");
    expect(result.params).toHaveProperty("address");
    expect(result.params).toHaveProperty("chainId");
    expect(result).toHaveProperty("description");
  });
});

describe("getLbtcApy", () => {
  it("has correct name and schema", () => {
    expect(getLbtcApy.name).toBe("get_lbtc_apy");
    expect(typeof getLbtcApy.execute).toBe("function");
  });
});

describe("getVaultPositions", () => {
  it("has correct name and schema", () => {
    expect(getVaultPositions.name).toBe("get_vault_positions");
    expect(getVaultPositions.parameters).toHaveProperty("properties");
    expect(typeof getVaultPositions.execute).toBe("function");
  });
});

describe("prepareClaimDeposit", () => {
  it("has correct name and schema", () => {
    expect(prepareClaimDeposit.name).toBe("prepare_claim_deposit");
    expect(prepareClaimDeposit.parameters).toHaveProperty("properties");
    expect(typeof prepareClaimDeposit.execute).toBe("function");
  });
});

describe("allTools", () => {
  it("has 22 entries", () => {
    expect(allTools).toHaveLength(22);
  });

  it("contains all expected tools including new ones", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("get_balance");
    expect(names).toContain("get_strategies");
    expect(names).toContain("get_deposit_btc_address");
    expect(names).toContain("check_fee_authorization");
    expect(names).toContain("prepare_btc_deposit");
    expect(names).toContain("get_lbtc_apy");
    expect(names).toContain("get_vault_positions");
    expect(names).toContain("prepare_claim_deposit");
    expect(names).toContain("prepare_vault_withdrawal");
    expect(names).toContain("get_morpho_lbtc_markets");
    expect(names).toContain("prepare_morpho_supply_collateral");
    expect(names).toContain("prepare_morpho_borrow");
    expect(names).toContain("get_morpho_position");
    expect(names).toContain("get_token_balance");
  });

  it("each tool has name, description, parameters, schema, and execute", () => {
    for (const tool of allTools) {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("parameters");
      expect(tool).toHaveProperty("schema");
      expect(tool).toHaveProperty("execute");
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(typeof tool.parameters).toBe("object");
      expect(typeof tool.schema).toBe("object");
      expect(typeof tool.execute).toBe("function");
    }
  });
});

describe("toolsByName", () => {
  it("maps tool names correctly", () => {
    for (const tool of allTools) {
      expect(toolsByName[tool.name]).toBe(tool);
    }
  });

  it("has the same number of entries as allTools", () => {
    expect(Object.keys(toolsByName)).toHaveLength(allTools.length);
  });

  it("contains new tools", () => {
    expect(toolsByName).toHaveProperty("get_balance");
    expect(toolsByName).toHaveProperty("get_strategies");
    expect(toolsByName).toHaveProperty("get_deposit_btc_address");
    expect(toolsByName).toHaveProperty("check_fee_authorization");
    expect(toolsByName).toHaveProperty("prepare_btc_deposit");
    expect(toolsByName).toHaveProperty("get_lbtc_apy");
    expect(toolsByName).toHaveProperty("get_vault_positions");
    expect(toolsByName).toHaveProperty("prepare_claim_deposit");
    expect(toolsByName).toHaveProperty("get_morpho_lbtc_markets");
    expect(toolsByName).toHaveProperty("prepare_morpho_supply_collateral");
    expect(toolsByName).toHaveProperty("prepare_morpho_borrow");
    expect(toolsByName).toHaveProperty("get_morpho_position");
  });
});

describe("getExchangeRate.execute", () => {
  it("returns lbtcToBtc, btcToLbtc, description, and minStakeAmountBtc", async () => {
    const result = await getExchangeRate.execute({});
    expect(result).toHaveProperty("lbtcToBtc");
    expect(result).toHaveProperty("btcToLbtc");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("minStakeAmountBtc");
    expect(typeof result.lbtcToBtc).toBe("string");
    expect(typeof result.btcToLbtc).toBe("string");
    expect(typeof result.description).toBe("string");
    expect(typeof result.minStakeAmountBtc).toBe("string");
  });
});
