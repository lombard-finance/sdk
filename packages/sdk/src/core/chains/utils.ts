/**
 * Chain Query Functions
 *
 * Utility functions for querying the chain catalog.
 *
 * @module core/chains/utils
 */

import {
  ChainId,
  isSolanaChain,
  isSuiChain,
  isValidChain,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  SolanaChain,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  StarknetChainId,
  SuiChain } from '../../common/chains';
import { LombardError, ValidationErrorCode } from '../../shared/errors';
import { CHAIN_CATALOG } from './catalog';
import {
  CAIP2_SEPARATOR,
  Chain,
  CHAIN_PREFIXES,
  ChainMetadata,
  ChainType,
  isChain } from './types';

/**
 * Maps CAIP-2 Solana genesis hash references to legacy SolanaChain constants.
 * 
 * CAIP-2 uses the first 32 chars of the genesis block hash as the reference,
 * while the legacy system uses network names like 'mainnet-beta', 'devnet', 'testnet'.
 * 
 * Genesis hashes:
 * - Mainnet: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp (full hash starts with 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc65hiGPAejCtx5...)
 * - Devnet: EtWTRABZaYq6iMfeYKouRu166VU2xqa1 (full hash starts with EtWTRABZaYq6iMfeYKouRu166VU2xqa1dT5ZqE8CjGWRXc...)
 * - Testnet: 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z (full hash starts with 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zUEzxnuRbtRMp8...)
 */
const SOLANA_GENESIS_TO_CHAIN: Record<string, SolanaChain> = {
  '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': SOLANA_MAINNET_CHAIN,
  'EtWTRABZaYq6iMfeYKouRu166VU2xqa1': SOLANA_DEVNET_CHAIN,
  '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': SOLANA_TESTNET_CHAIN };

/**
 * Maps CAIP-2 Starknet network names to Starknet hex chain IDs.
 *
 * CAIP-2 uses human-readable network names (SN_MAIN, SN_SEPOLIA) as the reference,
 * while Starknet SDK expects hex-encoded chain IDs.
 *
 * Mapping:
 * - SN_MAIN → 0x534e5f4d41494e (hex of "SN_MAIN")
 * - SN_SEPOLIA → 0x534e5f5345504f4c4941 (hex of "SN_SEPOLIA")
 */
const STARKNET_NETWORK_TO_CHAIN_ID: Record<string, StarknetChainId> = {
  SN_MAIN: STARKNET_MAINNET_CHAIN,
  SN_SEPOLIA: STARKNET_SEPOLIA_CHAIN };

/**
 * Converts a CAIP-2 Starknet network name to its hex chain ID.
 *
 * @param network - The network name from CAIP-2 (e.g., "SN_SEPOLIA")
 * @returns The Starknet hex chain ID, or undefined if not found
 */
function starknetNetworkToChainId(network: string): StarknetChainId | undefined {
  return STARKNET_NETWORK_TO_CHAIN_ID[network];
}

/** Get chain metadata */
export function getChainMetadata(chain: Chain): ChainMetadata {
  return CHAIN_CATALOG[chain];
}

/** Get the human-readable name for a chain */
export function getChainName(chain: Chain): string {
  return CHAIN_CATALOG[chain].name;
}

/** Get chain type */
export function getChainType(chain: Chain): ChainType {
  return CHAIN_CATALOG[chain].type;
}

/** Check if a chain is a testnet */
export function isTestnet(chain: Chain): boolean {
  return CHAIN_CATALOG[chain].isTestnet;
}

/** Check if a chain is a mainnet */
export function isMainnet(chain: Chain): boolean {
  return !CHAIN_CATALOG[chain].isTestnet;
}

/** Check if a chain is an EVM chain */
export function isEvmChain(chain: Chain): boolean {
  return CHAIN_CATALOG[chain].type === 'evm';
}

/** Get block explorer URL for an address */
export function getExplorerAddressUrl(
  chain: Chain,
  address: string,
): string | undefined {
  const { explorerUrl } = CHAIN_CATALOG[chain];
  if (!explorerUrl) return undefined;
  return `${explorerUrl}/address/${address}`;
}

/** Get block explorer URL for a transaction */
export function getExplorerTxUrl(
  chain: Chain,
  txHash: string,
): string | undefined {
  const { explorerUrl } = CHAIN_CATALOG[chain];
  if (!explorerUrl) return undefined;
  return `${explorerUrl}/tx/${txHash}`;
}

/** Get all mainnet chains */
export function getMainnetChains(): Chain[] {
  return (Object.keys(CHAIN_CATALOG) as Chain[]).filter(
    chain => !CHAIN_CATALOG[chain].isTestnet,
  );
}

/** Get all testnet chains */
export function getTestnetChains(): Chain[] {
  return (Object.keys(CHAIN_CATALOG) as Chain[]).filter(
    chain => CHAIN_CATALOG[chain].isTestnet,
  );
}

/** Get all chains of a specific type */
export function getChainsByType(type: ChainType): Chain[] {
  return (Object.keys(CHAIN_CATALOG) as Chain[]).filter(
    chain => CHAIN_CATALOG[chain].type === type,
  );
}

/** Helper to get prefix with separator */
const withSeparator = (prefix: string) => `${prefix}${CAIP2_SEPARATOR}`;

/** Parse a CAIP-2 chain identifier into its native chain representation */
export function parseChainIdentifier(
  chain: Chain,
): ChainId | SuiChain | SolanaChain | StarknetChainId {
  const evmPrefix = withSeparator(CHAIN_PREFIXES.EIP155);
  if (chain.startsWith(evmPrefix)) {
    const chainId = Number.parseInt(chain.slice(evmPrefix.length), 10);
    if (isValidChain(chainId)) return chainId;
    throw new LombardError(
      ValidationErrorCode.INVALID_CHAIN,
      `Invalid EVM chain: ${chain}`,
    );
  }

  const solanaPrefix = withSeparator(CHAIN_PREFIXES.SOLANA);
  if (chain.startsWith(solanaPrefix)) {
    const reference = chain.slice(solanaPrefix.length);
    
    // First check if it's already in legacy format (e.g., 'mainnet-beta', 'devnet')
    const legacyChain = `solana:${reference}`;
    if (isSolanaChain(legacyChain)) return legacyChain as SolanaChain;
    
    // Otherwise, map CAIP-2 genesis hash to legacy format
    const mappedChain = SOLANA_GENESIS_TO_CHAIN[reference];
    if (mappedChain) return mappedChain;
    
    throw new LombardError(
      ValidationErrorCode.INVALID_CHAIN,
      `Invalid Solana chain: ${chain}`,
    );
  }

  const suiPrefix = withSeparator(CHAIN_PREFIXES.SUI);
  if (chain.startsWith(suiPrefix)) {
    // isSuiChain expects the full chain ID (e.g., 'sui:testnet'), not just the network part
    if (isSuiChain(chain)) return chain as SuiChain;
    throw new LombardError(
      ValidationErrorCode.INVALID_CHAIN,
      `Invalid Sui chain: ${chain}`,
    );
  }

  const starknetPrefix = withSeparator(CHAIN_PREFIXES.STARKNET);
  if (chain.startsWith(starknetPrefix)) {
    const network = chain.slice(starknetPrefix.length);
    // Map CAIP-2 network names to Starknet hex chain IDs
    const starknetChainId = starknetNetworkToChainId(network);
    if (starknetChainId) return starknetChainId;
    throw new LombardError(
      ValidationErrorCode.INVALID_CHAIN,
      `Invalid Starknet chain: ${chain}`,
    );
  }

  throw new LombardError(
    ValidationErrorCode.INVALID_CHAIN,
    `Invalid chain: ${chain}`,
  );
}

/**
 * Convert an EVM ChainId (number) to a Chain (CAIP-2 string).
 *
 * @param chainId - Numeric EVM chain ID
 * @returns CAIP-2 chain identifier
 *
 * @example
 * ```typescript
 * evmChainIdToChain(1) // "eip155:1" (Ethereum)
 * evmChainIdToChain(43114) // "eip155:43114" (Avalanche)
 * ```
 */
export function evmChainIdToChain(chainId: ChainId): Chain {
  return `${CHAIN_PREFIXES.EIP155}${CAIP2_SEPARATOR}${chainId}` as Chain;
}

/** @deprecated Use getChainMetadata instead */
export interface ChainTypeMetadata {
  type: string;
  label: string;
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
}

/** @deprecated Use getChainMetadata instead */
export function getChainTypeMetadata(chain: Chain | string): ChainTypeMetadata {
  if (isChain(chain)) {
    const meta = CHAIN_CATALOG[chain];
    return {
      type: meta.type,
      label: meta.type.toUpperCase(),
      variant: meta.badgeVariant };
  }
  const prefix = chain.split(':')[0];
  return { type: prefix, label: prefix.toUpperCase(), variant: 'secondary' };
}
