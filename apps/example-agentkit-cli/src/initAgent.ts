import {
  AgentKit,
  ViemWalletProvider,
  walletActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { lombardActionProvider } from "@lombard.finance/sdk-agentkit";

import { CHAINS } from "./config.js";

export async function initAgent(networkId: string) {
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

  // Dual viem versions (workspace root vs local) cause type mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletProvider = new ViemWalletProvider(walletClient as any);

  const agentkit = await AgentKit.from({
    walletProvider,
    actionProviders: [
      walletActionProvider(),
      lombardActionProvider(),
    ],
  });

  const tools = await getLangChainTools(agentkit);

  return { walletProvider, tools };
}
