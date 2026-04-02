import { describe, it, expect, vi } from "vitest";

import { allTools, toolsByName, getExchangeRate } from "../tools";

vi.mock("@lombard.finance/sdk", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@lombard.finance/sdk");
  return {
    ...actual,
    getLBTCExchangeRate: vi.fn().mockResolvedValue({
      exchangeRate: 1,
      minAmount: 100000,
    }),
  };
});

describe("allTools", () => {
  it("has 8 entries", () => {
    expect(allTools).toHaveLength(8);
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
});

describe("getExchangeRate.execute", () => {
  it("returns mintingRate, description, and minStakeAmountBtc", async () => {
    const result = await getExchangeRate.execute({});
    expect(result).toHaveProperty("mintingRate");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("minStakeAmountBtc");
    expect(result.mintingRate).toBe(1);
    expect(typeof result.description).toBe("string");
    expect(typeof result.minStakeAmountBtc).toBe("string");
  });
});
