import BigNumber from "bignumber.js";

/** Starknet Main (mainnet) chain id */
const SN_MAIN = "0x534e5f4d41494e" as const;
/** Starknet Sepolia chain id */
const SN_SEPOLIA = "0x534e5f5345504f4c4941" as const;

/** Prefixes the destination chain with 0x04... */
export function makeDestinationChainId(chainId: `0x${string}`) {
  const ch = BigInt(chainId);
  const ch64 = `0x04${ch.toString(16).padStart(64, "0").slice(2)}`;
  return BigNumber(ch64).toFixed(0);
}

/** Starknet chain id */
export const StarknetChainId = {
  SN_MAIN: SN_MAIN,
  SN_SEPOLIA: SN_SEPOLIA,
} as const;

export type StarknetChainId =
  (typeof StarknetChainId)[keyof typeof StarknetChainId];

/** Starknet chain identifier (human readable). */
export enum StarknetChain {
  Mainnet = "starknet:mainnet",
  Sepolia = "starknet:sepolia",
}

export type ChainParameters = {
  /** The starknet chain identifier. */
  chainId?: StarknetChainId;
};
