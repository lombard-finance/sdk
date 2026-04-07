import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerAllTools, sanitizeError } from "../tools.js";

// ─── Mock sdk-agent tools ───────────────────────────────────────────

const { mockExecute } = vi.hoisted(() => {
  return { mockExecute: vi.fn() };
});

vi.mock("@lombard.finance/sdk-agent", () => {
  const makeTool = (name: string, description: string) => ({
    name,
    description,
    execute: mockExecute,
  });

  const AddressAndChainZod = {
    shape: {
      address: {
        optional: () => ({ describe: () => ({}) }),
        describe: () => ({}),
      },
      chainId: {
        optional: () => ({ describe: () => ({}) }),
        describe: () => ({}),
      },
    },
  };

  const ExchangeRateZod = {
    shape: {
      chainId: { optional: () => ({ describe: () => ({}) }), describe: () => ({}) },
    },
  };

  const BalanceZod = AddressAndChainZod;
  const StrategiesZod = ExchangeRateZod;
  const DepositBtcZod = AddressAndChainZod;

  return {
    getLbtcBalance: makeTool("get_lbtc_balance", "Check the LBTC balance"),
    getBtcbBalance: makeTool("get_btcb_balance", "Check the BTC.b balance"),
    getBalance: makeTool("get_balance", "Check both balances"),
    getExchangeRate: makeTool("get_exchange_rate", "Get exchange rate"),
    getDepositStatusTool: makeTool("get_deposit_status", "Check deposit status"),
    getUnstakeStatusTool: makeTool("get_unstake_status", "Check unstake status"),
    getStrategies: makeTool("get_strategies", "List strategies"),
    getDepositBtcAddress: makeTool("get_deposit_btc_address", "Get BTC deposit address"),
    AddressAndChainZod,
    ExchangeRateZod,
    BalanceZod,
    StrategiesZod,
    DepositBtcZod,
  };
});

// ─── Track registered tools ─────────────────────────────────────────

interface RegisteredTool {
  name: string;
  description: string;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

let registeredTools: RegisteredTool[] = [];

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      tool: (
        name: string,
        description: string,
        _schema: unknown,
        handler: (params: Record<string, unknown>) => Promise<unknown>,
      ) => {
        registeredTools.push({ name, description, handler });
      },
    })),
  };
});

// Suppress console.error during tests
vi.spyOn(console, "error").mockImplementation(() => {});

// ─── Tests ──────────────────────────────────────────────────────────

describe("registerAllTools", () => {
  beforeEach(() => {
    registeredTools = [];
    mockExecute.mockReset();
  });

  it("registers exactly 8 read-only tools", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllTools(server, { env: "mainnet" });

    expect(registeredTools).toHaveLength(8);
  });

  it("registers the correct tool names", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllTools(server, { env: "mainnet" });

    const names = registeredTools.map((t) => t.name);
    expect(names).toContain("get_lbtc_balance");
    expect(names).toContain("get_btcb_balance");
    expect(names).toContain("get_balance");
    expect(names).toContain("get_exchange_rate");
    expect(names).toContain("get_deposit_status");
    expect(names).toContain("get_unstake_status");
    expect(names).toContain("get_strategies");
    expect(names).toContain("get_deposit_btc_address");
  });

  it("does NOT register any write tools", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllTools(server, { env: "mainnet" });

    const names = registeredTools.map((t) => t.name);
    expect(names).not.toContain("prepare_stake");
    expect(names).not.toContain("prepare_unstake");
    expect(names).not.toContain("prepare_deploy_to_vault");
  });

  it("returns JSON text content on success", async () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllTools(server, { env: "mainnet" });

    const resultData = { balance: "1.5", token: "LBTC", chain: "Ethereum", address: "0x123" };
    mockExecute.mockResolvedValue(resultData);

    const tool = registeredTools.find((t) => t.name === "get_lbtc_balance")!;
    const result = await tool.handler({ address: "0x1234567890abcdef1234567890abcdef12345678", chainId: 1 });

    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(resultData, null, 2) }],
    });
  });

  it("returns sanitized error on failure", async () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllTools(server, { env: "mainnet" });

    mockExecute.mockRejectedValue(
      new Error("Failed to fetch from https://internal-api.lombard.finance/v1/balance"),
    );

    const tool = registeredTools.find((t) => t.name === "get_lbtc_balance")!;
    const result = (await tool.handler({ address: "0x1234567890abcdef1234567890abcdef12345678", chainId: 1 })) as {
      content: Array<{ type: string; text: string }>;
      isError: boolean;
    };

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).not.toContain("https://");
    expect(parsed.error).toContain("[redacted-url]");
  });

  it("injects default chainId for mainnet when not provided", async () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllTools(server, { env: "mainnet" });

    mockExecute.mockResolvedValue({ balance: "0" });

    const tool = registeredTools.find((t) => t.name === "get_lbtc_balance")!;
    await tool.handler({ address: "0x1234567890abcdef1234567890abcdef12345678" });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: 1 }),
    );
  });

  it("injects default chainId for testnet when not provided", async () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllTools(server, { env: "testnet" });

    mockExecute.mockResolvedValue({ balance: "0" });

    const tool = registeredTools.find((t) => t.name === "get_lbtc_balance")!;
    await tool.handler({ address: "0x1234567890abcdef1234567890abcdef12345678" });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: 11155111 }),
    );
  });

  it("preserves user-provided chainId", async () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    registerAllTools(server, { env: "mainnet" });

    mockExecute.mockResolvedValue({ balance: "0" });

    const tool = registeredTools.find((t) => t.name === "get_lbtc_balance")!;
    await tool.handler({ address: "0x1234567890abcdef1234567890abcdef12345678", chainId: 8453 });

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: 8453 }),
    );
  });
});

describe("sanitizeError", () => {
  it("strips HTTP URLs", () => {
    const result = sanitizeError(new Error("Failed at https://api.example.com/v1/foo"));
    expect(result).not.toContain("https://");
    expect(result).toContain("[redacted-url]");
  });

  it("strips WebSocket URLs", () => {
    const result = sanitizeError(new Error("WS error wss://rpc.example.com"));
    expect(result).not.toContain("wss://");
    expect(result).toContain("[redacted-url]");
  });

  it("strips long hex data", () => {
    const hex = "0x" + "a".repeat(64);
    const result = sanitizeError(new Error(`Reverted with ${hex}`));
    expect(result).not.toContain(hex);
    expect(result).toContain("[redacted-hex]");
  });

  it("returns generic message for non-Error values", () => {
    expect(sanitizeError("string error")).toBe("Internal error, please try again");
    expect(sanitizeError(null)).toBe("Internal error, please try again");
    expect(sanitizeError(undefined)).toBe("Internal error, please try again");
  });

  it("returns generic message for empty error message", () => {
    expect(sanitizeError(new Error(""))).toBe("Internal error, please try again");
  });

  it("preserves clean error messages", () => {
    expect(sanitizeError(new Error("Unsupported chain ID: 999"))).toBe(
      "Unsupported chain ID: 999",
    );
  });
});
