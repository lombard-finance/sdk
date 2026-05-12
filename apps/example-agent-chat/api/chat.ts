import { createAnthropic } from "@ai-sdk/anthropic";
import { LOMBARD_SYSTEM_PROMPT } from "@lombard.finance/sdk-agent";
import { lombardTools } from "@lombard.finance/sdk-agent/vercel";
import { streamText } from "ai";

// Vercel serverless function for /api/chat
// Runs server-side on Vercel, keeping API keys out of the browser.

const anthropic = createAnthropic();

export async function POST(request: Request) {
  const { messages, walletContext } = await request.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extend the SDK's default system prompt with wallet context
  let system = LOMBARD_SYSTEM_PROMPT;
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
      system += `\n\n# Wallet context (this turn)\n`;
      system += `Use these values when a tool needs the user's address or chain. Do not ask the user for them.\n`;
      system += `- address: ${addr}\n`;
      if (chainId) system += `- chainId: ${chainId}\n`;
      if (chainName) system += `- chainName: ${chainName}\n`;
    }
  } else {
    // No wallet connected — make this explicit so the LLM tells the user.
    system += `\n\n# Wallet context (this turn)\nNo wallet is connected. If the user asks for balances, deposits, or any address-bound operation, tell them to connect a wallet first.`;
  }

  const result = streamText({
    model: anthropic(process.env.MODEL_NAME || "claude-sonnet-4-6"),
    system,
    messages,
    tools: lombardTools,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
