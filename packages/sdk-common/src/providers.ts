import type { EIP1193Provider } from "viem";

/**
 * Provider interfaces shared between the core SDK and optional chain modules.
 */
export interface EvmProvider extends EIP1193Provider {}

export interface BtcProvider {
  getAddresses(): Promise<string[]>;
  signMessage(message: string): Promise<string>;
  getNetwork?(): Promise<string>;
}

export interface SolanaProvider {
  signMessage(message: Uint8Array | string): Promise<{ signature: Uint8Array }>;
  publicKey?: { toString(): string };
  network?: string;
}

export interface SuiProvider {
  getWallet(): unknown;
  getWalletAccount(): unknown;
}

export interface StarknetProvider {
  getProvider(): unknown;
}

export type AnyProvider =
  | EvmProvider
  | BtcProvider
  | SolanaProvider
  | SuiProvider
  | StarknetProvider;

export const ProviderKeys = [
  "evm",
  "bitcoin",
  "solana",
  "sui",
  "starknet",
] as const;
export type ProviderKey = (typeof ProviderKeys)[number];

export interface ProviderMap {
  evm: EvmProvider;
  bitcoin: BtcProvider;
  solana: SolanaProvider;
  sui: SuiProvider;
  starknet: StarknetProvider;
}

export type ProviderFor<TKey extends ProviderKey> = ProviderMap[TKey];
