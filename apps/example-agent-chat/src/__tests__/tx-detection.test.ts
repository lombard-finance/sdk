/**
 * Tests that TransactionPrompt cards are correctly detected from
 * tool invocation results in Vercel AI SDK message structures.
 */
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
function extractTxActions(message: Record<string, unknown>): TxResult[] {
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

  // Check parts array (Vercel AI SDK v4 format)
  const parts = (message.parts || []) as Array<Record<string, unknown>>;
  for (const part of parts) {
    if (part.type === "tool-invocation") {
      const inv = part.toolInvocation as Record<string, unknown> | undefined;
      if (inv?.state === "result") {
        tryExtract(inv.result as Record<string, unknown> | undefined);
      }
    }
  }
  // Check toolInvocations array (Vercel AI SDK v3 / legacy format)
  for (const inv of (message.toolInvocations || []) as Array<
    Record<string, unknown>
  >) {
    if (inv.state === "result") {
      tryExtract(inv.result as Record<string, unknown> | undefined);
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

describe("tx action detection", () => {
  it("detects Morpho supply collateral in v4 parts format", () => {
    const message = {
      role: "assistant",
      content: "I prepared the transaction.",
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolName: "prepare_morpho_supply_collateral",
            result: MORPHO_TOOL_RESULT,
          },
        },
        { type: "text", text: "I prepared the transaction." },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(1);
    expect(actions[0].method).toBe("morpho.supplyCollateral");
    expect(actions[0].params.chainId).toBe(1);
  });

  it("detects Morpho supply collateral in legacy toolInvocations format", () => {
    const message = {
      role: "assistant",
      content: "I prepared the transaction.",
      toolInvocations: [
        {
          state: "result",
          toolName: "prepare_morpho_supply_collateral",
          result: MORPHO_TOOL_RESULT,
        },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(1);
    expect(actions[0].method).toBe("morpho.supplyCollateral");
  });

  it("detects sdk_execute in multi-step message (read tool then write tool)", () => {
    // Simulates: step 1 = get_morpho_lbtc_markets, step 2 = prepare_morpho_supply_collateral, step 3 = text
    const message = {
      role: "assistant",
      content: "Here are the markets. I've prepared the transaction.",
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolName: "get_morpho_lbtc_markets",
            result: { markets: [], note: "Found 5 markets" },
          },
        },
        { type: "text", text: "Here are the markets." },
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolName: "prepare_morpho_supply_collateral",
            result: MORPHO_TOOL_RESULT,
          },
        },
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
      content: "Staking prepared.",
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolName: "prepare_stake",
            result: STAKE_TOOL_RESULT,
          },
        },
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
      content: "Your balance is 1.5 LBTC.",
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolName: "get_lbtc_balance",
            result: { balance: "1.5", token: "LBTC" },
          },
        },
        { type: "text", text: "Your balance is 1.5 LBTC." },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(0);
  });

  it("ignores tool invocations with state != result", () => {
    const message = {
      role: "assistant",
      content: "",
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "call",
            toolName: "prepare_morpho_supply_collateral",
          },
        },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(0);
  });

  it("deduplicates identical tool results", () => {
    const message = {
      role: "assistant",
      content: "Done.",
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolName: "prepare_morpho_supply_collateral",
            result: MORPHO_TOOL_RESULT,
          },
        },
      ],
      toolInvocations: [
        {
          state: "result",
          toolName: "prepare_morpho_supply_collateral",
          result: MORPHO_TOOL_RESULT,
        },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(1);
  });

  it("detects multiple different write tools in one message", () => {
    const message = {
      role: "assistant",
      content: "Both prepared.",
      parts: [
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolName: "prepare_stake",
            result: STAKE_TOOL_RESULT,
          },
        },
        {
          type: "tool-invocation",
          toolInvocation: {
            state: "result",
            toolName: "prepare_morpho_supply_collateral",
            result: MORPHO_TOOL_RESULT,
          },
        },
      ],
    };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(2);
  });

  it("handles empty message (no parts or toolInvocations)", () => {
    const message = { role: "user", content: "Hello" };
    const actions = extractTxActions(message);
    expect(actions).toHaveLength(0);
  });
});
