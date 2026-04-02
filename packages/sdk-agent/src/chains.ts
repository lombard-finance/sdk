import { ChainId, Env } from "@lombard.finance/sdk";
import type { Chain } from "viem";
import { mainnet, sepolia, base, baseSepolia } from "viem/chains";

export interface ChainConfig {
  chain: Chain;
  chainId: ChainId;
  env: Env;
  name: string;
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  [mainnet.id]: { chain: mainnet, chainId: ChainId.ethereum, env: Env.prod, name: "Ethereum" },
  [sepolia.id]: { chain: sepolia, chainId: ChainId.sepolia, env: Env.testnet, name: "Sepolia" },
  [base.id]: { chain: base, chainId: ChainId.base, env: Env.prod, name: "Base" },
  [baseSepolia.id]: { chain: baseSepolia, chainId: ChainId.baseSepoliaTestnet, env: Env.testnet, name: "Base Sepolia" },
};

export function getChainConfig(chainId: number): ChainConfig {
  const config = SUPPORTED_CHAINS[chainId];
  if (!config) {
    const supported = Object.keys(SUPPORTED_CHAINS).join(", ");
    throw new Error(`Unsupported chain ID: ${chainId}. Supported: ${supported}`);
  }
  return config;
}
