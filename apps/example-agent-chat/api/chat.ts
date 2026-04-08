import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { lombardTools } from "@lombard.finance/sdk-agent/vercel";

// Vercel serverless function for /api/chat
// Runs server-side on Vercel, keeping API keys out of the browser.

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

export async function POST(request: Request) {
  const { messages, walletContext } = await request.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: contextualPrompt,
    messages,
    tools: lombardTools,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
