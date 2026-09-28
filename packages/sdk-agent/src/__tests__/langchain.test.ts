import { describe, expect, it } from "vitest";
import { z } from "zod";

import { lombardLangChainTools, toLangChainTool } from "../langchain";

describe("toLangChainTool", () => {
  it("converts a ToolDefinition to a LangChain tool", () => {
    const testSchema = z.object({ x: z.string() });
    const tool = toLangChainTool({
      name: "test_tool",
      description: "A test tool",
      parameters: {
        type: "object",
        properties: { x: { type: "string" } },
        required: ["x"],
      },
      schema: testSchema,
      execute: async ({ x }: { x: string }) => ({ result: x }),
    });

    expect(tool.name).toBe("test_tool");
    expect(tool.description).toBe("A test tool");
    expect(typeof tool.invoke).toBe("function");
  });

  it("invokes the definition and returns its result as JSON", async () => {
    const tool = toLangChainTool({
      name: "test_tool",
      description: "A test tool",
      parameters: {},
      schema: z.object({ x: z.string() }),
      execute: async ({ x }: { x: string }) => ({ result: x }),
    });

    await expect(tool.invoke({ x: "hello" })).resolves.toBe(
      JSON.stringify({ result: "hello" }),
    );
  });

  it("rejects input that fails the schema without executing", async () => {
    const calls: unknown[] = [];
    const tool = toLangChainTool({
      name: "test_tool",
      description: "A test tool",
      parameters: {},
      schema: z.object({ x: z.string() }),
      execute: async (input: { x: string }) => {
        calls.push(input);
        return {};
      },
    });

    await expect(tool.invoke({ x: 42 })).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});

describe("lombardLangChainTools", () => {
  it("returns an array of LangChain tools", () => {
    expect(Array.isArray(lombardLangChainTools)).toBe(true);
    expect(lombardLangChainTools.length).toBeGreaterThan(0);
  });

  it("each tool has name and description", () => {
    for (const tool of lombardLangChainTools) {
      expect(typeof tool.name).toBe("string");
      expect(typeof tool.description).toBe("string");
    }
  });
});
