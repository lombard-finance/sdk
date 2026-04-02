import { sepolia, mainnet, baseSepolia, base } from "viem/chains";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CHAINS: Record<string, any> = {
  "ethereum-sepolia": sepolia,
  "ethereum-mainnet": mainnet,
  "base-sepolia": baseSepolia,
  "base-mainnet": base,
};
