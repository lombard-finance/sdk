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
import * as readline from "readline";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { lombardActionProvider } from "@lombard.finance/sdk-agentkit";

import { CHAINS } from "./config.js";

const SYSTEM_PROMPT = `You are an AI agent specialized in Bitcoin staking via the Lombard protocol.
You can help users:
- Stake BTC.b to receive LBTC (yield-bearing Bitcoin)
- Unstake LBTC back to BTC or BTC.b
- Deploy LBTC into DeFi vaults for additional yield
- Check balances, exchange rates, and deposit/unstake statuses
- Claim notarized deposits

Always confirm with the user before executing transactions.
When checking balances, show the token symbol and chain.
If a user asks about yield or APY, explain that base LBTC yield comes from Babylon staking,
but higher yields are available by deploying LBTC into DeFi vaults via the deploy_to_defi action.`;

async function initializeAgent() {
  const networkId = process.env.NETWORK_ID || "ethereum-sepolia";
  const chain = CHAINS[networkId];
  if (!chain) {
    throw new Error(`Unsupported network: ${networkId}. Use one of: ${Object.keys(CHAINS).join(", ")}`);
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

  const llm = new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0,
  });

  const memory = new MemorySaver();
  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier: SYSTEM_PROMPT,
  });

  const address = walletProvider.getAddress();
  console.log(`\nAgent wallet: ${address}`);
  console.log(`Network: ${networkId}`);

  const lombardTools = tools.filter(t =>
    t.name.includes("lbtc") || t.name.includes("btc") ||
    t.name.includes("deploy") || t.name.includes("claim") ||
    t.name.includes("deposit") || t.name.includes("unstake") ||
    t.name.includes("stake"),
  );
  console.log(`Lombard actions: ${lombardTools.map(t => t.name).join(", ")}`);

  return { agent, address };
}

async function main() {
  console.log("Lombard AgentKit Chatbot");
  console.log("========================\n");

  const required = ["ANTHROPIC_API_KEY", "WALLET_PRIVATE_KEY"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    console.error("Copy .env.example to .env and fill in the values.");
    process.exit(1);
  }

  const { agent } = await initializeAgent();
  const threadId = `lombard-${Date.now()}`;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question("\nYou: ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed || trimmed === "exit" || trimmed === "quit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      try {
        const config = { configurable: { thread_id: threadId } };
        const stream = await agent.stream(
          { messages: [new HumanMessage(trimmed)] },
          config,
        );

        let response = "";
        for await (const chunk of stream) {
          if ("agent" in chunk) {
            for (const msg of chunk.agent.messages) {
              if (typeof msg.content === "string" && msg.content.length > 0) {
                response = msg.content;
              }
            }
          }
          if ("tools" in chunk) {
            for (const msg of chunk.tools.messages) {
              console.log(`  [tool: ${msg.name}] ${String(msg.content).slice(0, 200)}`);
            }
          }
        }

        console.log(`\nAgent: ${response}`);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
      }

      prompt();
    });
  };

  console.log('Type "exit" to quit.\n');
  prompt();
}

main().catch(console.error);
