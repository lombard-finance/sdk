import type { Network } from "@coinbase/agentkit";
import { ChainId } from "@lombard.finance/sdk";
import { Env } from "@lombard.finance/sdk-common";
import type { Chain } from "viem";
import { base, baseSepolia, mainnet, sepolia } from "viem/chains";

/**
 * Maps AgentKit network IDs to Lombard SDK ChainId values.
 *
 * Only includes networks where Lombard contracts are deployed.
 */
const NETWORK_ID_TO_LOMBARD_CHAIN: Record<string, ChainId> = {
  "ethereum-mainnet": ChainId.ethereum,
  "ethereum-sepolia": ChainId.sepolia,
  "base-mainnet": ChainId.base,
  "base-sepolia": ChainId.baseSepoliaTestnet,
};

/**
 * Maps AgentKit network IDs to Lombard SDK Env values.
 */
const NETWORK_ID_TO_ENV: Record<string, Env> = {
  "ethereum-mainnet": Env.prod,
  "ethereum-sepolia": Env.testnet,
  "base-mainnet": Env.prod,
  "base-sepolia": Env.testnet,
};

/**
 * Maps AgentKit network IDs to viem `Chain` objects, for callers that need
 * to construct a wallet/public client outside of the action provider.
 */
export const NETWORK_ID_TO_VIEM_CHAIN: Record<string, Chain> = {
  "ethereum-mainnet": mainnet,
  "ethereum-sepolia": sepolia,
  "base-mainnet": base,
  "base-sepolia": baseSepolia,
};

export interface ResolvedNetwork {
  chainId: ChainId;
  env: Env;
  networkId: string;
}

/**
 * Resolves an AgentKit Network to Lombard SDK chain parameters.
 *
 * @returns ResolvedNetwork or null if the network is not supported
 */
export function resolveNetwork(network: Network): ResolvedNetwork | null {
  const networkId = network.networkId;
  if (!networkId) return null;

  const chainId = NETWORK_ID_TO_LOMBARD_CHAIN[networkId];
  const env = NETWORK_ID_TO_ENV[networkId];

  if (chainId === undefined || !env) return null;

  return { chainId, env, networkId };
}

/**
 * Resolves a user-supplied chain name string to Lombard SDK chain parameters.
 *
 * Accepts both AgentKit network IDs (e.g., "ethereum-mainnet") and
 * friendly names (e.g., "ethereum", "base-sepolia").
 */
export function resolveChainName(chainName: string): ResolvedNetwork | null {
  const normalized = chainName.toLowerCase().trim();

  // Try direct match on network ID
  if (NETWORK_ID_TO_LOMBARD_CHAIN[normalized] !== undefined) {
    return {
      chainId: NETWORK_ID_TO_LOMBARD_CHAIN[normalized],
      env: NETWORK_ID_TO_ENV[normalized],
      networkId: normalized,
    };
  }

  // Friendly name aliases
  const aliases: Record<string, string> = {
    ethereum: "ethereum-mainnet",
    eth: "ethereum-mainnet",
    mainnet: "ethereum-mainnet",
    sepolia: "ethereum-sepolia",
    base: "base-mainnet",
    "base-sep": "base-sepolia",
  };

  const resolved = aliases[normalized];
  if (resolved && NETWORK_ID_TO_LOMBARD_CHAIN[resolved] !== undefined) {
    return {
      chainId: NETWORK_ID_TO_LOMBARD_CHAIN[resolved],
      env: NETWORK_ID_TO_ENV[resolved],
      networkId: resolved,
    };
  }

  return null;
}

/**
 * Checks if a given AgentKit Network is supported by the Lombard provider.
 */
export function isLombardSupportedNetwork(network: Network): boolean {
  return resolveNetwork(network) !== null;
}

export { NETWORK_ID_TO_ENV, NETWORK_ID_TO_LOMBARD_CHAIN };
