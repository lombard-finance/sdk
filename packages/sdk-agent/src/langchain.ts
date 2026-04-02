/**
 * LangChain adapter for Lombard agent tools.
 *
 * Usage:
 * ```ts
 * import { lombardLangChainTools } from "@lombard.finance/sdk-agent/langchain";
 * import { AgentExecutor } from "langchain/agents";
 *
 * const agent = AgentExecutor.fromAgentAndTools({ agent, tools: lombardLangChainTools });
 * ```
 */
import { tool } from "@langchain/core/tools";

import { allTools, type ToolDefinition } from "./tools";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toLangChainTool(def: ToolDefinition<any, any>) {
  return tool(
    async (input) => JSON.stringify(await def.execute(input)),
    {
      name: def.name,
      description: def.description,
      schema: def.parameters as Record<string, unknown>,
    },
  );
}

export const lombardLangChainTools = allTools.map(toLangChainTool);
