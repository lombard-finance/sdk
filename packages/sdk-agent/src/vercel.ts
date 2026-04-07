/**
 * Vercel AI SDK adapter for Lombard agent tools.
 *
 * Usage:
 * ```ts
 * import { lombardTools } from "@lombard.finance/sdk-agent/vercel";
 * import { streamText } from "ai";
 *
 * const result = streamText({ model, tools: lombardTools, messages });
 * ```
 */
import { jsonSchema,tool as aiTool } from "ai";

import { allTools, type ToolDefinition } from "./tools";

/**
 * Converts a framework-agnostic ToolDefinition into a Vercel AI SDK tool.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAiTool(def: ToolDefinition<any, any>): any {
  const createTool = aiTool as unknown as (opts: {
    name: string;
    description: string;
    parameters: unknown;
    execute: (...args: unknown[]) => Promise<unknown>;
  }) => unknown;
  return createTool({
    name: def.name,
    description: def.description,
    parameters: jsonSchema(def.parameters as Parameters<typeof jsonSchema>[0]),
    execute: def.execute,
  });
}

/**
 * All Lombard tools formatted for the Vercel AI SDK's `tools` parameter.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const lombardTools: Record<string, any> = Object.fromEntries(
  allTools.map((t) => [t.name, toAiTool(t)]),
);

export { toAiTool };
