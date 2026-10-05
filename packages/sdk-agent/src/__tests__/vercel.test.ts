import { generateText, stepCountIs, streamText } from "ai";
import {
  convertArrayToReadableStream,
  convertReadableStreamToArray,
  MockLanguageModelV2,
} from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { lombardTools, toAiTool } from "../vercel";

const usage = { inputTokens: 1, outputTokens: 1, totalTokens: 2 };

const textReply = (text: string) => ({
  content: [{ type: "text" as const, text }],
  finishReason: "stop" as const,
  usage,
  warnings: [],
});

const echoCall = (input: unknown) => ({
  content: [
    {
      type: "tool-call" as const,
      toolCallId: "call-1",
      toolName: "echo_tool",
      input: JSON.stringify(input),
    },
  ],
  finishReason: "tool-calls" as const,
  usage,
  warnings: [],
});

function makeEchoTool() {
  const calls: unknown[] = [];
  const tool = toAiTool({
    name: "echo_tool",
    description: "Echoes its input",
    parameters: {
      type: "object",
      properties: { x: { type: "string" } },
      required: ["x"],
    },
    schema: z.object({ x: z.string() }),
    execute: async (input: { x: string }) => {
      calls.push(input);
      return { echoed: input.x };
    },
  });
  return { tool, calls };
}

describe("toAiTool", () => {
  it("sends the Zod schema to the model as the tool input schema", async () => {
    const { tool } = makeEchoTool();
    const model = new MockLanguageModelV2({ doGenerate: textReply("ok") });

    await generateText({ model, prompt: "hi", tools: { echo_tool: tool } });

    expect(model.doGenerateCalls[0].tools).toEqual([
      expect.objectContaining({
        type: "function",
        name: "echo_tool",
        description: "Echoes its input",
        inputSchema: expect.objectContaining({
          type: "object",
          properties: { x: { type: "string" } },
          required: ["x"],
        }),
      }),
    ]);
  });

  it("executes the tool on a model tool call and returns its output", async () => {
    const { tool, calls } = makeEchoTool();
    const model = new MockLanguageModelV2({
      doGenerate: [echoCall({ x: "hello" }), textReply("done")],
    });

    const result = await generateText({
      model,
      prompt: "hi",
      tools: { echo_tool: tool },
      stopWhen: stepCountIs(2),
    });

    expect(calls).toEqual([{ x: "hello" }]);
    expect(result.steps[0].toolResults).toEqual([
      expect.objectContaining({
        toolName: "echo_tool",
        input: { x: "hello" },
        output: { echoed: "hello" },
      }),
    ]);
    expect(result.text).toBe("done");
  });

  it("does not execute the tool when the model input fails the schema", async () => {
    const { tool, calls } = makeEchoTool();
    const model = new MockLanguageModelV2({
      doGenerate: [echoCall({ x: 42 }), textReply("done")],
    });

    const result = await generateText({
      model,
      prompt: "hi",
      tools: { echo_tool: tool },
      stopWhen: stepCountIs(2),
    });

    expect(calls).toEqual([]);
    expect(
      result.steps[0].content.filter((part) => part.type === "tool-error"),
    ).toHaveLength(1);
  });

  it("streams the tool output as a UI message chunk", async () => {
    const { tool } = makeEchoTool();
    const model = new MockLanguageModelV2({
      doStream: [
        {
          stream: convertArrayToReadableStream([
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "echo_tool",
              input: JSON.stringify({ x: "streamed" }),
            },
            { type: "finish", finishReason: "tool-calls", usage },
          ]),
        },
        {
          stream: convertArrayToReadableStream([
            { type: "text-start", id: "t1" },
            { type: "text-delta", id: "t1", delta: "done" },
            { type: "text-end", id: "t1" },
            { type: "finish", finishReason: "stop", usage },
          ]),
        },
      ],
    });

    const result = streamText({
      model,
      prompt: "hi",
      tools: { echo_tool: tool },
      stopWhen: stepCountIs(2),
    });
    const chunks = await convertReadableStreamToArray(
      result.toUIMessageStream(),
    );

    expect(chunks).toContainEqual(
      expect.objectContaining({
        type: "tool-output-available",
        toolCallId: "call-1",
        output: { echoed: "streamed" },
      }),
    );
    expect(await result.text).toBe("done");
  });
});

describe("lombardTools", () => {
  it("offers every tool to the model with an object input schema", async () => {
    const model = new MockLanguageModelV2({ doGenerate: textReply("ok") });

    await generateText({ model, prompt: "hi", tools: lombardTools });

    const sent = model.doGenerateCalls[0].tools ?? [];
    expect(sent.map((t) => t.name).sort()).toEqual(
      Object.keys(lombardTools).sort(),
    );
    for (const t of sent) {
      expect(t.type === "function" && t.inputSchema.type).toBe("object");
    }
  });
});
