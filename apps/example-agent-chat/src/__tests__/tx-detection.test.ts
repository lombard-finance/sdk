/**
 * Tests that TransactionPrompt cards are correctly detected from
 * tool invocation results in Vercel AI SDK message structures.
 */
import { isToolUIPart, type UIMessage } from "ai";
import { describe, expect, it } from "vitest";

interface TxResult {
  action: string;
  method: string;
  description: string;
  params: Record<string, unknown>;
}

/**
 * Mirrors the detection logic in ChatPanel's MessageBubble.
 */
function extractTxActions(message: {
  parts: Array<Record<string, unknown>>;
}): TxResult[] {
  const txActions: TxResult[] = [];
  const seen = new Set<string>();

  function tryExtract(r: Record<string, unknown> | undefined) {
    if (r?.action === "sdk_execute" && r.method && r.description && r.params) {
      const key = `${r.method}:${r.description}`;
      if (!seen.has(key)) {
        seen.add(key);
        txActions.push(r as unknown as TxResult);
      }
    }
  }

  // Tool results arrive as `tool-<name>` parts (Vercel AI SDK v5 format)
  for (const part of message.parts as UIMessage["parts"]) {
    if (isToolUIPart(part) && part.state === "output-available") {
      tryExtract(part.output as Record<string, unknown> | undefined);
    }
  }

  return txActions;
}

const MORPHO_TOOL_RESULT = {
  action: "sdk_execute",
  method: "morpho.supplyCollateral",
  params: {
    chainId: 1,
    transactions: [
      {
        to: "0x8236a87084f8B84306f72007F36F2618A5634494",
        data: "0xabc123",
        label: "Approve",
      },
      {
        to: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
        data: "0xdef456",
        label: "Supply",
      },
    ],
  },
  marketId:
    "0xbf02d6c6852fa0b8247d5514d0c91e6c1fbde9a168ac3fd2033028b5ee5ce6d0",
  description: "Supply 0.1 LBTC as collateral",
};

const STAKE_TOOL_RESULT = {
  action: "sdk_execute",
  method: "evm.stake",
  params: { amount: "0.1", chainId: 1 },
  description: "Stake 0.1 BTC.b for LBTC on Ethereum",
};

const toolPart = (
  toolName: string,
  output: unknown,
  state = "output-available",
) => ({
  type: `tool-${toolName}`,
  toolCallId: `call-${toolName}`,
  state,
  input: {},
  output,
});

describe("tx action detection", () => {
  it("detects Morpho supply collateral in a tool part", () => {
    const message = {
      role: "assistant",
      parts: [
        { type: "step-start" },
        toolPart("prepare_morpho_supply_collateral", MORPHO_TOOL_RESULT),
        { type: "text", text: "I prepared the transaction." },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(1);
    expect(actions[0].method).toBe("morpho.supplyCollateral");
    expect(actions[0].params.chainId).toBe(1);
  });

  it("ignores a tool part that ended in an error", () => {
    const message = {
      role: "assistant",
      parts: [
        {
          type: "tool-prepare_morpho_supply_collateral",
          toolCallId: "call-1",
          state: "output-error",
          input: {},
          errorText: "RPC timed out",
        },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(0);
  });

  it("detects sdk_execute in multi-step message (read tool then write tool)", () => {
    // Simulates: step 1 = get_morpho_lbtc_markets, step 2 = prepare_morpho_supply_collateral, step 3 = text
    const message = {
      role: "assistant",
      parts: [
        { type: "step-start" },
        toolPart("get_morpho_lbtc_markets", {
          markets: [],
          note: "Found 5 markets",
        }),
        { type: "text", text: "Here are the markets." },
        { type: "step-start" },
        toolPart("prepare_morpho_supply_collateral", MORPHO_TOOL_RESULT),
        { type: "text", text: "I've prepared the transaction." },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(1);
    expect(actions[0].method).toBe("morpho.supplyCollateral");
  });

  it("detects existing stake tool", () => {
    const message = {
      role: "assistant",
      parts: [
        toolPart("prepare_stake", STAKE_TOOL_RESULT),
        { type: "text", text: "Staking prepared." },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(1);
    expect(actions[0].method).toBe("evm.stake");
  });

  it("ignores read-only tool results (no action field)", () => {
    const message = {
      role: "assistant",
      parts: [
        toolPart("get_lbtc_balance", { balance: "1.5", token: "LBTC" }),
        { type: "text", text: "Your balance is 1.5 LBTC." },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(0);
  });

  it("ignores tool parts whose output is not available yet", () => {
    const message = {
      role: "assistant",
      parts: [
        {
          type: "tool-prepare_morpho_supply_collateral",
          toolCallId: "call-1",
          state: "input-available",
          input: {},
        },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(0);
  });

  it("deduplicates identical tool results", () => {
    const message = {
      role: "assistant",
      parts: [
        toolPart("prepare_morpho_supply_collateral", MORPHO_TOOL_RESULT),
        {
          ...toolPart("prepare_morpho_supply_collateral", MORPHO_TOOL_RESULT),
          toolCallId: "call-2",
        },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(1);
  });

  it("detects multiple different write tools in one message", () => {
    const message = {
      role: "assistant",
      parts: [
        toolPart("prepare_stake", STAKE_TOOL_RESULT),
        toolPart("prepare_morpho_supply_collateral", MORPHO_TOOL_RESULT),
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(2);
  });

  it("handles a message with only text", () => {
    const message = { role: "user", parts: [{ type: "text", text: "Hello" }] };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(0);
  });
});
