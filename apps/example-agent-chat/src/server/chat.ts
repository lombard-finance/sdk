import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import type { Request, Response } from "express";

import { lombardTools } from "./tools.js";

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
Keep responses concise and direct.`;

export async function chatHandler(req: Request, res: Response) {
  const { messages, walletContext } = req.body;

  // Inject wallet context into system prompt if available
  let contextualPrompt = SYSTEM_PROMPT;
  if (walletContext) {
    contextualPrompt += `\n\nUser's wallet context:
- Address: ${walletContext.address}
- Chain ID: ${walletContext.chainId}
- Chain name: ${walletContext.chainName}`;
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
