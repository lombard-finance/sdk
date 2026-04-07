import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getBalance,
  getBtcbBalance,
  getDepositBtcAddress,
  getDepositStatusTool,
  getExchangeRate,
  getLbtcBalance,
  getStrategies,
  getUnstakeStatusTool,
  AddressAndChainZod,
  ExchangeRateZod,
  BalanceZod,
  StrategiesZod,
  DepositBtcZod,
  type ToolDefinition,
} from "@lombard.finance/sdk-agent";
import { z } from "zod";

// ─── Default chain IDs per environment ──────────────────────────────

const DEFAULT_CHAIN_IDS: Record<string, number> = {
  mainnet: 1,
  testnet: 11155111,
};

// ─── Error sanitization ─────────────────────────────────────────────

/**
 * Sanitize error messages to avoid leaking internal URLs, hex data,
 * or raw stack traces to MCP clients.
 */
export function sanitizeError(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Internal error, please try again";
  }

  let message = err.message;

  // Strip URLs (http/https/ws/wss)
  message = message.replace(/https?:\/\/[^\s"')]+/g, "[redacted-url]");
  message = message.replace(/wss?:\/\/[^\s"')]+/g, "[redacted-url]");

  // Strip long hex strings (likely tx hashes, addresses in error context, etc.)
  message = message.replace(/0x[a-fA-F0-9]{64,}/g, "[redacted-hex]");

  // Strip stack traces
  message = message.replace(/\n\s+at\s+.*/g, "");

  // Trim whitespace
  message = message.trim();

  if (!message) {
    return "Internal error, please try again";
  }

  return message;
}

// ─── Tool registration ──────────────────────────────────────────────

interface ToolConfig {
  env: "mainnet" | "testnet";
}

/**
 * Wraps a sdk-agent tool's execute function in MCP error handling.
 * If the user did not specify a chainId, the default for the current
 * environment is injected.
 */
function wrapExecute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: ToolDefinition<any, any>,
  config: ToolConfig,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (params: any) => {
    try {
      // Inject default chainId when not provided
      const resolvedParams =
        params.chainId == null
          ? { ...params, chainId: DEFAULT_CHAIN_IDS[config.env] }
          : params;

      const result = await tool.execute(resolvedParams);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = sanitizeError(err);
      // Log full error to stderr for debugging (stdout is reserved for MCP protocol)
      console.error(`[lombard-mcp] Error in ${tool.name}:`, err);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  };
}

/**
 * Register all 8 read-only Lombard tools on the MCP server.
 */
export function registerAllTools(server: McpServer, config: ToolConfig): void {
  // get_lbtc_balance
  server.tool(
    getLbtcBalance.name,
    getLbtcBalance.description,
    {
      address: AddressAndChainZod.shape.address,
      chainId: AddressAndChainZod.shape.chainId.optional(),
    },
    wrapExecute(getLbtcBalance, config),
  );

  // get_btcb_balance
  server.tool(
    getBtcbBalance.name,
    getBtcbBalance.description,
    {
      address: AddressAndChainZod.shape.address,
      chainId: AddressAndChainZod.shape.chainId.optional(),
    },
    wrapExecute(getBtcbBalance, config),
  );

  // get_balance
  server.tool(
    getBalance.name,
    getBalance.description,
    {
      address: BalanceZod.shape.address,
      chainId: BalanceZod.shape.chainId.optional(),
    },
    wrapExecute(getBalance, config),
  );

  // get_exchange_rate
  server.tool(
    getExchangeRate.name,
    getExchangeRate.description,
    {
      chainId: ExchangeRateZod.shape.chainId,
    },
    wrapExecute(getExchangeRate, config),
  );

  // get_deposit_status
  server.tool(
    getDepositStatusTool.name,
    getDepositStatusTool.description,
    {
      address: AddressAndChainZod.shape.address,
      chainId: AddressAndChainZod.shape.chainId.optional(),
    },
    wrapExecute(getDepositStatusTool, config),
  );

  // get_unstake_status
  server.tool(
    getUnstakeStatusTool.name,
    getUnstakeStatusTool.description,
    {
      address: AddressAndChainZod.shape.address,
      chainId: AddressAndChainZod.shape.chainId.optional(),
    },
    wrapExecute(getUnstakeStatusTool, config),
  );

  // get_strategies
  server.tool(
    getStrategies.name,
    getStrategies.description,
    {
      chainId: StrategiesZod.shape.chainId,
    },
    wrapExecute(getStrategies, config),
  );

  // get_deposit_btc_address
  server.tool(
    getDepositBtcAddress.name,
    getDepositBtcAddress.description,
    {
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address").describe("EVM wallet address (0x...)"),
      chainId: AddressAndChainZod.shape.chainId.optional(),
    },
    wrapExecute(getDepositBtcAddress, config),
  );
}
