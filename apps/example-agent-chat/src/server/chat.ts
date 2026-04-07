import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import type { Request, Response } from "express";

import { lombardTools } from "./tools.js";

// Supports two modes:
// 1. Direct: Set ANTHROPIC_API_KEY (default, for local dev and server deployments)
// 2. Proxy: Set API_URL + API_BYPASS_TOKEN to route through a proxy server
//    that keeps the API key server-side (e.g., Steve proxy on Vercel)
const anthropic = createAnthropic(
  process.env.API_URL
    ? {
        baseURL: process.env.API_URL,
        headers: process.env.API_BYPASS_TOKEN
          ? { "X-Vercel-Protection-Bypass": process.env.API_BYPASS_TOKEN }
          : {},
        apiKey: process.env.ANTHROPIC_API_KEY || "proxy-mode",
      }
    : {},
);

const SYSTEM_PROMPT = `You are a helpful Bitcoin staking assistant for the Lombard protocol.

You help users:
- Check their LBTC and BTC.b balances
- View the LBTC/BTC exchange rate
- Check deposit and unstake statuses
- Stake BTC.b to get LBTC
- Unstake LBTC back to BTC or BTC.b
- Deploy LBTC into DeFi vaults for yield

For READ operations (balances, rates, statuses), execute them immediately.
For WRITE operations (stake, unstake, deploy), describe what will happen and
return the transaction parameters. The user's frontend wallet will handle signing.

When reporting balances, include the token symbol and chain name.
Keep responses concise and direct.

Default to Ethereum mainnet (chain ID 1) for operations unless the user specifies
a different chain or their wallet is connected to another network. Yield strategies
and vault data are only available on Ethereum mainnet.`;

export async function chatHandler(req: Request, res: Response) {
  const { messages, walletContext } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages must be a non-empty array" });
    return;
  }

  // Inject wallet context into system prompt if available
  let contextualPrompt = SYSTEM_PROMPT;
  if (walletContext) {
    const addr =
      typeof walletContext.address === "string" &&
      /^0x[a-fA-F0-9]{40}$/.test(walletContext.address)
        ? walletContext.address
        : null;
    const chainId =
      typeof walletContext.chainId === "number" ? walletContext.chainId : null;
    const chainName =
      typeof walletContext.chainName === "string"
        ? walletContext.chainName.replace(/[^a-zA-Z0-9 -]/g, "").slice(0, 50)
        : null;

    if (addr) {
      contextualPrompt += `\n\nUser's wallet context:`;
      contextualPrompt += `\n- Address: ${addr}`;
      if (chainId) contextualPrompt += `\n- Chain ID: ${chainId}`;
      if (chainName) contextualPrompt += `\n- Chain name: ${chainName}`;
    }
  }

  console.log(`[chat] ${messages?.length} messages, wallet: ${walletContext?.address || "none"}`);

  try {
    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: contextualPrompt,
      messages,
      tools: lombardTools,
      maxSteps: 5,
      onError: (error) => {
        console.error("[chat] Stream error:", error);
      },
    });

    result.pipeDataStreamToResponse(res);
  } catch (error) {
    console.error("[chat] Handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
