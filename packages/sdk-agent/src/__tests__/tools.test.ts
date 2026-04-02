import { describe, it, expect, vi } from "vitest";

import {
  allTools,
  getBalance,
  getDepositBtcAddress,
  getExchangeRate,
  getStrategies,
  toolsByName,
} from "../tools";

vi.mock("@lombard.finance/sdk", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@lombard.finance/sdk");
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

describe("allTools", () => {
  it("has 11 entries", () => {
    expect(allTools).toHaveLength(11);
  });

  it("contains all expected tools including new ones", () => {
    const names = allTools.map((t) => t.name);
    expect(names).toContain("get_balance");
    expect(names).toContain("get_strategies");
    expect(names).toContain("get_deposit_btc_address");
  });

  it("each tool has name, description, parameters, and execute", () => {
    for (const tool of allTools) {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("parameters");
      expect(tool).toHaveProperty("execute");
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
      expect(typeof tool.parameters).toBe("object");
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
