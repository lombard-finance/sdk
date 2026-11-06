/**
 * Chain Types
 *
 * Type definitions and constants for chains.
 *
 * @module core/chains/types
 */

// ═══════════════════════════════════════════════════════════════════════════
// Chain Prefixes (CAIP-2 namespaces)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CAIP-2 namespace prefixes for chain identification.
 *
 * Official namespaces (registered with ChainAgnostic):
 * - EIP155: EVM-compatible chains
 * - BIP122: Bitcoin and Bitcoin-derived chains (uses genesis block hash as reference)
 * - SOLANA: Solana blockchain
 * - STARKNET: Starknet L2
 *
 * Unofficial namespaces (not yet registered, used for internal identification):
 * - SUI: Sui blockchain (proposal pending)
 * - ZCASH, RIPPLE, DOGECOIN, HYPERLIQUID: Internal use only
 *
 * @see https://chainagnostic.org/CAIPs/caip-2
 * @see https://namespaces.chainagnostic.org
 */
export const CHAIN_PREFIXES = {
  // Official CAIP-2 namespaces
  BIP122: 'bip122',
  EIP155: 'eip155',
  SOLANA: 'solana',
  STARKNET: 'starknet',

  // Unofficial namespaces (internal use)
  SUI: 'sui',
  ZCASH: 'zcash',
  RIPPLE: 'ripple',
  DOGECOIN: 'dogecoin',
  HYPERLIQUID: 'hyperliquid',
} as const;

/** CAIP-2 separator between namespace and reference */
export const CAIP2_SEPARATOR = ':' as const;

// ═══════════════════════════════════════════════════════════════════════════
// Chain Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Helper to construct CAIP-2 identifier */
const caip2 = (prefix: string, reference: string | number) =>
  `${prefix}${CAIP2_SEPARATOR}${reference}` as const;

/**
 * Canonical chain identifiers using CAIP-2 format.
 */
export const Chain = {
  // Bitcoin chains (BIP122: first 32 chars of genesis block hash in little-endian)
  BITCOIN_MAINNET: caip2(
    CHAIN_PREFIXES.BIP122,
    '000000000019d6689c085ae165831e93',
  ),
  BITCOIN_SIGNET: caip2(
    CHAIN_PREFIXES.BIP122,
    '00000008819873e925422c1ff0f99f7c',
  ),

  // EVM chains (EIP155: numeric chain ID)
  ETHEREUM: caip2(CHAIN_PREFIXES.EIP155, 1),
  BASE: caip2(CHAIN_PREFIXES.EIP155, 8453),
  BASE_SEPOLIA: caip2(CHAIN_PREFIXES.EIP155, 84532),
  OPTIMISM: caip2(CHAIN_PREFIXES.EIP155, 10),
  POLYGON: caip2(CHAIN_PREFIXES.EIP155, 137),
  BSC: caip2(CHAIN_PREFIXES.EIP155, 56),
  BSC_TESTNET: caip2(CHAIN_PREFIXES.EIP155, 97),
  AVALANCHE: caip2(CHAIN_PREFIXES.EIP155, 43114),
  AVALANCHE_FUJI: caip2(CHAIN_PREFIXES.EIP155, 43113),
  BERACHAIN: caip2(CHAIN_PREFIXES.EIP155, 80094),
  BERACHAIN_BARTIO: caip2(CHAIN_PREFIXES.EIP155, 80084),
  BOB: caip2(CHAIN_PREFIXES.EIP155, 60808),
  /**
   * @deprecated Corn is retired. Its catalog entry is kept for labelling
   * historical activity only; see RETIRED_CHAINS. Removed in 7.0.0.
   */
  CORN: caip2(CHAIN_PREFIXES.EIP155, 21000000),
  ETHERLINK: caip2(CHAIN_PREFIXES.EIP155, 42793),
  KATANA: caip2(CHAIN_PREFIXES.EIP155, 747474),
  MORPH: caip2(CHAIN_PREFIXES.EIP155, 2818),
  SONIC: caip2(CHAIN_PREFIXES.EIP155, 146),
  SONIC_TESTNET: caip2(CHAIN_PREFIXES.EIP155, 57054),
  SONIC_BLAZE_TESTNET: caip2(CHAIN_PREFIXES.EIP155, 57054), // Alias
  /**
   * @deprecated Swellchain is retired. Its catalog entry is kept for labelling
   * historical activity only; see RETIRED_CHAINS. Removed in 7.0.0.
   */
  SWELL: caip2(CHAIN_PREFIXES.EIP155, 1923),
  TAC: caip2(CHAIN_PREFIXES.EIP155, 239),
  SEPOLIA: caip2(CHAIN_PREFIXES.EIP155, 11155111),
  HOLESKY: caip2(CHAIN_PREFIXES.EIP155, 17000),
  MEGAETH: caip2(CHAIN_PREFIXES.EIP155, 4326),
  MONAD: caip2(CHAIN_PREFIXES.EIP155, 143),
  STABLE: caip2(CHAIN_PREFIXES.EIP155, 988),

  // Solana chains (first 32 chars of genesis hash)
  SOLANA_MAINNET: caip2(
    CHAIN_PREFIXES.SOLANA,
    '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  ),
  SOLANA_DEVNET: caip2(
    CHAIN_PREFIXES.SOLANA,
    'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  ),
  SOLANA_TESTNET: caip2(
    CHAIN_PREFIXES.SOLANA,
    '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
  ),

  // Sui chains (unofficial namespace, using cluster names)
  SUI_MAINNET: caip2(CHAIN_PREFIXES.SUI, 'mainnet'),
  SUI_TESTNET: caip2(CHAIN_PREFIXES.SUI, 'testnet'),
  SUI_DEVNET: caip2(CHAIN_PREFIXES.SUI, 'devnet'),

  // Starknet chains (uses network identifiers)
  STARKNET_MAINNET: caip2(CHAIN_PREFIXES.STARKNET, 'SN_MAIN'),
  STARKNET_SEPOLIA: caip2(CHAIN_PREFIXES.STARKNET, 'SN_SEPOLIA'),

  // Zcash (unofficial namespace)
  ZCASH_MAINNET: caip2(CHAIN_PREFIXES.ZCASH, 'mainnet'),
  ZCASH_TESTNET: caip2(CHAIN_PREFIXES.ZCASH, 'testnet'),

  // Ripple (unofficial namespace)
  RIPPLE_MAINNET: caip2(CHAIN_PREFIXES.RIPPLE, 'mainnet'),
  RIPPLE_TESTNET: caip2(CHAIN_PREFIXES.RIPPLE, 'testnet'),

  // Dogecoin (unofficial namespace)
  DOGECOIN_MAINNET: caip2(CHAIN_PREFIXES.DOGECOIN, 'mainnet'),
  DOGECOIN_TESTNET: caip2(CHAIN_PREFIXES.DOGECOIN, 'testnet'),

  // Custodial (unofficial namespace)
  HYPERLIQUID: caip2(CHAIN_PREFIXES.HYPERLIQUID, 'mainnet'),
} as const;

export type Chain = (typeof Chain)[keyof typeof Chain];

// ═══════════════════════════════════════════════════════════════════════════
// Metadata Types
// ═══════════════════════════════════════════════════════════════════════════

export type ChainType =
  | 'bitcoin'
  | 'evm'
  | 'solana'
  | 'sui'
  | 'starknet'
  | 'zcash'
  | 'ripple'
  | 'dogecoin'
  | 'hyperliquid';

export interface ChainMetadata {
  /** Human-readable chain name */
  name: string;
  /** Chain type/ecosystem */
  type: ChainType;
  /** Whether this is a testnet/devnet */
  isTestnet: boolean;
  /** Block explorer URL */
  explorerUrl?: string;
  /** Native currency symbol */
  nativeCurrency?: string;
  /** UI badge variant */
  badgeVariant:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'danger'
    | 'warning'
    | 'info';
}

// ═══════════════════════════════════════════════════════════════════════════
// Type Utilities
// ═══════════════════════════════════════════════════════════════════════════

/** Convert Chain value to its key name */
export function chainValueToKey(value: string): string {
  return (
    Object.keys(Chain).find(
      (key) => Chain[key as keyof typeof Chain] === value,
    ) ?? ''
  );
}

/** Type guard to check if a value is a valid Chain */
export function isChain(value: unknown): value is Chain {
  return (
    typeof value === 'string' && Object.values(Chain).includes(value as Chain)
  );
}
