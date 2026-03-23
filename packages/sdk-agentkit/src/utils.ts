import type { EvmWalletProvider } from "@coinbase/agentkit";
import type { ChainId } from "@lombard.finance/sdk";
import {
  CHAIN_ID_TO_VIEM_CHAIN_MAP,
  getTokenContractInfo,
  Token,
} from "@lombard.finance/sdk";
import type { Env } from "@lombard.finance/sdk-common";
import type { Address, EIP1193Provider, Hex } from "viem";
import { createPublicClient, formatUnits, http } from "viem";

/**
 * Adapts a Coinbase AgentKit EvmWalletProvider into a viem-compatible
 * EIP1193Provider that the Lombard SDK contract functions expect.
 *
 * The adapter implements the `request` method by delegating to the
 * appropriate EvmWalletProvider method for each JSON-RPC call.
 */
export function toEIP1193Provider(
  walletProvider: EvmWalletProvider,
  chainId: ChainId,
): EIP1193Provider {
  const chain = CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId];

  // Create a public client for delegating read RPC calls
  const publicClient = chain
    ? createPublicClient({ chain, transport: http() })
    : null;

  // Use a Proxy to implement the EIP1193 request interface.
  // This avoids complex viem type gymnastics while correctly routing
  // wallet operations to the AgentKit provider and reads to a public client.
  const handler = async ({
    method,
    params,
  }: {
    method: string;
    params?: unknown[];
  }): Promise<unknown> => {
    switch (method) {
      case "eth_accounts":
        return [walletProvider.getAddress() as Address];

      case "eth_chainId":
        return `0x${chainId.toString(16)}`;

      case "eth_sendTransaction": {
        const tx = (params as unknown[])?.[0] as Record<string, unknown>;
        return walletProvider.sendTransaction({
          to: tx.to as Address,
          value: tx.value ? BigInt(tx.value as string) : undefined,
          data: tx.data as Hex | undefined,
          gas: tx.gas ? BigInt(tx.gas as string) : undefined,
        });
      }

      case "personal_sign": {
        const [message] = params as [string];
        return walletProvider.signMessage(message);
      }

      case "eth_signTypedData_v4": {
        const [, typedDataJson] = params as [string, string];
        const typedData =
          typeof typedDataJson === "string"
            ? JSON.parse(typedDataJson)
            : typedDataJson;
        return walletProvider.signTypedData(typedData);
      }

      default: {
        if (!publicClient) {
          throw new Error(`Unsupported RPC method: ${method}`);
        }
        return (
          publicClient as unknown as {
            request: (args: unknown) => Promise<unknown>;
          }
        ).request({ method, params });
      }
    }
  };

  return { request: handler } as unknown as EIP1193Provider;
}

/**
 * Reads an ERC20 token balance using the AgentKit wallet provider's
 * readContract method directly (avoids needing EIP1193 adapter for reads).
 */
export async function getTokenBalance(
  walletProvider: EvmWalletProvider,
  token: Token,
  chainId: ChainId,
  address: Address,
  env?: Env,
): Promise<{ balance: bigint; formatted: string; decimals: number }> {
  const tokenInfo = await getTokenContractInfo(token, chainId, env);
  const tokenAddress = tokenInfo.address as Address;

  const balance = await walletProvider.readContract({
    address: tokenAddress,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const,
    functionName: "balanceOf",
    args: [address],
  });

  // Token decimals default to 8 for BTC-like tokens
  const decimals = 8;
  const formatted = formatUnits(balance as bigint, decimals);

  return { balance: balance as bigint, formatted, decimals };
}

/**
 * Format a result string for AgentKit action responses.
 */
export function formatSuccess(
  action: string,
  details: Record<string, unknown>,
): string {
  return JSON.stringify({ success: true, action, ...details });
}

export function formatError(action: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return JSON.stringify({ success: false, action, error: message });
}
