import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerAllTools } from "./tools.js";

const VALID_ENVS = ["mainnet", "testnet"] as const;
type LombardEnv = (typeof VALID_ENVS)[number];

const rawEnv = process.env.LOMBARD_ENV ?? "mainnet";
const env: LombardEnv = VALID_ENVS.includes(rawEnv as LombardEnv)
  ? (rawEnv as LombardEnv)
  : "mainnet";

if (rawEnv !== env) {
  console.error(
    `[lombard-mcp] Invalid LOMBARD_ENV "${rawEnv}", falling back to "mainnet"`,
  );
}

const server = new McpServer({
  name: "lombard",
  version: "0.1.0",
});

registerAllTools(server, { env });

const transport = new StdioServerTransport();
await server.connect(transport);

console.error(`[lombard-mcp] Server started (env=${env})`);
