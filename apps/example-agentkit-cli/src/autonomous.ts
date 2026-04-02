/**
 * Autonomous mode: the agent runs a predefined set of read-only Lombard
 * operations without user interaction. Useful for validating the action
 * provider end-to-end.
 */
import "dotenv/config";

import {
  AgentKit,
  ViemWalletProvider,
  walletActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { lombardActionProvider } from "@lombard.finance/sdk-agentkit";

import { CHAINS } from "./config.js";

const TASKS = [
  "What is the current LBTC/BTC exchange rate?",
  "Check my LBTC balance on this chain.",
  "Check my BTC.b balance on this chain.",
  "Check if I have any pending deposits.",
  "Check if I have any pending unstakes.",
];

async function main() {
  console.log("Lombard AgentKit - Autonomous Validation");
  console.log("==========================================\n");

  const required = ["ANTHROPIC_API_KEY", "WALLET_PRIVATE_KEY"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const networkId = process.env.NETWORK_ID || "ethereum-sepolia";
  const chain = CHAINS[networkId];
  if (!chain) {
    throw new Error(`Unsupported network: ${networkId}`);
  }

  const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.RPC_URL),
  });

  const walletProvider = new ViemWalletProvider(walletClient);

  const agentkit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      walletActionProvider(),
      lombardActionProvider(),
    ],
  });

  const tools = await getLangChainTools(agentkit);
  console.log(`Available tools (${tools.length}):`);
  for (const tool of tools) {
    console.log(`  - ${tool.name}: ${tool.description.slice(0, 80)}...`);
  }

  const llm = new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0,
  });

  const memory = new MemorySaver();
  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier:
      "You are a Bitcoin staking agent using the Lombard protocol. " +
      "Execute the requested operations and report results clearly. " +
      "For read-only operations, proceed without confirmation.",
  });

  const address = walletProvider.getAddress();
  console.log(`\nWallet: ${address}`);
  console.log(`Network: ${networkId}\n`);

  const config = { configurable: { thread_id: `auto-${Date.now()}` } };
  let passed = 0;
  let failed = 0;

  for (const task of TASKS) {
    console.log(`\n--- Task: ${task}`);
    try {
      const stream = await agent.stream(
        { messages: [new HumanMessage(task)] },
        config,
      );

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          for (const msg of chunk.agent.messages) {
            if (typeof msg.content === "string" && msg.content.length > 0) {
              console.log(`  Agent: ${msg.content.slice(0, 300)}`);
            }
          }
        }
        if ("tools" in chunk) {
          for (const msg of chunk.tools.messages) {
            console.log(`  [${msg.name}] ${String(msg.content).slice(0, 200)}`);
          }
        }
      }

      passed++;
      console.log("  PASS");
    } catch (error) {
      failed++;
      console.error(`  FAIL: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`\n==========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${TASKS.length}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
