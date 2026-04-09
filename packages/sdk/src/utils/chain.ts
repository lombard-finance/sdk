/**
 * Chain Utility Functions
 *
 * Provides type-safe utilities for working with Chain enum values.
 * Handles parsing and validation of CAIP-2 chain identifiers.
 *
 * @module utils/chain
 */

import { CAIP2_SEPARATOR, Chain, CHAIN_PREFIXES } from "../core";
import { LombardError, ValidationErrorCode } from "../shared/errors";

/** Helper to get prefix with separator */
const withSeparator = (prefix: string) => `${prefix}${CAIP2_SEPARATOR}`;

/**
 * Parse EVM chain ID from Chain enum
 *
 * Extracts the numeric chain ID from an EVM chain identifier.
 *
 * @param chain - Chain enum value
 * @returns Numeric EVM chain ID
 * @throws {ValidationError} If chain is not an EVM chain
 *
 * @example
 * ```typescript
 * parseEvmChainId(Chain.ETHEREUM) // 1
 * parseEvmChainId(Chain.BASE) // 8453
 * parseEvmChainId(Chain.BITCOIN_MAINNET) // throws ValidationError
 * ```
 */
export function parseEvmChainId(chain: Chain): number {
  const chainStr = String(chain);
  const evmPrefix = withSeparator(CHAIN_PREFIXES.EIP155);
  const isEvm = chainStr.startsWith(evmPrefix);

  if (!isEvm) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `Not an EVM chain: ${chainStr}`,
    );
  }

  const chainId = Number.parseInt(chainStr.slice(evmPrefix.length), 10);

  if (Number.isNaN(chainId)) {
    throw new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `Invalid EVM chain ID: ${chainStr}`,
    );
  }

  return chainId;
}

/**
 * Check if chain is an EVM chain
 *
 * @param chain - Chain enum value
 * @returns True if chain is an EVM chain
 *
 * @example
 * ```typescript
 * isEvmChain(Chain.ETHEREUM) // true
 * isEvmChain(Chain.BITCOIN_MAINNET) // false
 * ```
 */
export function isEvmChain(chain: Chain): boolean {
  return String(chain).startsWith(withSeparator(CHAIN_PREFIXES.EIP155));
}

/**
 * Check if chain is a Bitcoin chain
 *
 * @param chain - Chain enum value
 * @returns True if chain is a Bitcoin chain
 *
 * @example
 * ```typescript
 * isBitcoinChain(Chain.BITCOIN_MAINNET) // true
 * isBitcoinChain(Chain.ETHEREUM) // false
 * ```
 */
export function isBitcoinChain(chain: Chain): boolean {
  return String(chain).startsWith(withSeparator(CHAIN_PREFIXES.BIP122));
}

/**
 * Check if chain is a Solana chain
 *
 * @param chain - Chain enum value
 * @returns True if chain is a Solana chain
 *
 * @example
 * ```typescript
 * isSolanaChain(Chain.SOLANA_MAINNET) // true
 * isSolanaChain(Chain.ETHEREUM) // false
 * ```
 */
export function isSolanaChain(chain: Chain): boolean {
  return String(chain).startsWith(withSeparator(CHAIN_PREFIXES.SOLANA));
}

/**
 * Check if chain is a Sui chain
 *
 * @param chain - Chain enum value
 * @returns True if chain is a Sui chain
 *
 * @example
 * ```typescript
 * isSuiChain(Chain.SUI_MAINNET) // true
 * isSuiChain(Chain.ETHEREUM) // false
 * ```
 */
export function isSuiChain(chain: Chain): boolean {
  return String(chain).startsWith(withSeparator(CHAIN_PREFIXES.SUI));
}

/**
 * Check if chain is a Starknet chain
 *
 * @param chain - Chain enum value
 * @returns True if chain is a Starknet chain
 *
 * @example
 * ```typescript
 * isStarknetChain(Chain.STARKNET_MAINNET) // true
 * isStarknetChain(Chain.ETHEREUM) // false
 * ```
 */
export function isStarknetChain(chain: Chain): boolean {
  return String(chain).startsWith(withSeparator(CHAIN_PREFIXES.STARKNET));
}

/**
 * Get chain namespace from Chain enum
 *
 * Returns the CAIP-2 namespace prefix (eip155, bip122, solana, etc.)
 *
 * @param chain - Chain enum value
 * @returns CAIP-2 namespace string
 *
 * @example
 * ```typescript
 * getChainNamespace(Chain.ETHEREUM) // 'eip155'
 * getChainNamespace(Chain.BITCOIN_MAINNET) // 'bip122'
 * ```
 */
export function getChainNamespace(chain: Chain): string {
  return String(chain).split(CAIP2_SEPARATOR)[0];
}

/**
 * Map a CAIP-2 Solana chain identifier to the network string expected by
 * sdk-solana functions (e.g. 'mainnet-beta', 'devnet', 'testnet').
 *
 * @throws LombardError if the chain ID is not a recognised Solana chain
 */
export function chainToSolanaNetwork(chainId: string): string {
  const CHAIN_TO_NETWORK: Record<string, string> = {
    [Chain.SOLANA_MAINNET]: "mainnet-beta",
    [Chain.SOLANA_DEVNET]: "devnet",
    [Chain.SOLANA_TESTNET]: "testnet",
    "solana:mainnet-beta": "mainnet-beta",
    "solana:devnet": "devnet",
    "solana:testnet": "testnet",
  };

  const network = CHAIN_TO_NETWORK[chainId];
  if (!network) {
    throw new LombardError(
      ValidationErrorCode.INVALID_CHAIN,
      `Unknown Solana chain: ${chainId}. Expected one of: ${Object.keys(CHAIN_TO_NETWORK).join(", ")}`,
    );
  }
  return network;
}
