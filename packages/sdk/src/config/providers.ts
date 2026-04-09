export type {
  AnyProvider,
  BtcProvider,
  EvmProvider,
  ProviderKey,
  ProviderMap,
  SolanaProvider,
  StarknetProvider,
  SuiProvider,
} from "@lombard.finance/sdk-common";
import type {
  BtcProvider,
  EvmProvider,
  SolanaProvider,
  StarknetProvider,
  SuiProvider,
} from "@lombard.finance/sdk-common";

/**
 * Type guard to check if a provider is an EVM provider
 */
export function isEvmProvider(provider: unknown): provider is EvmProvider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "request" in provider &&
    typeof (provider as EvmProvider).request === "function"
  );
}

/**
 * Type guard to check if a provider is a Bitcoin provider
 */
export function isBtcProvider(provider: unknown): provider is BtcProvider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "getAddresses" in provider &&
    typeof (provider as BtcProvider).getAddresses === "function"
  );
}

/**
 * Type guard to check if a provider is a Solana provider
 */
export function isSolanaProvider(
  provider: unknown,
): provider is SolanaProvider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "publicKey" in provider &&
    "signAndSendTransaction" in provider
  );
}

/**
 * Type guard to check if a provider is a Sui provider
 */
export function isSuiProvider(provider: unknown): provider is SuiProvider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "getAddress" in provider &&
    "signAndExecuteTransactionBlock" in provider
  );
}

/**
 * Type guard to check if a provider is a Starknet provider
 */
export function isStarknetProvider(
  provider: unknown,
): provider is StarknetProvider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "address" in provider &&
    "execute" in provider
  );
}
