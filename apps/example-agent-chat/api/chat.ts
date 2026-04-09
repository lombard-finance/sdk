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
    return new Response(
      JSON.stringify({ error: "messages must be a non-empty array" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
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
      system += `\n\nUser's wallet context:`;
      system += `\n- Address: ${addr}`;
      if (chainId) system += `\n- Chain ID: ${chainId}`;
      if (chainName) system += `\n- Chain name: ${chainName}`;
    }
  }

  const result = streamText({
    model: anthropic(process.env.MODEL_NAME || "claude-sonnet-4-20250514"),
    system,
    messages,
    tools: lombardTools,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
