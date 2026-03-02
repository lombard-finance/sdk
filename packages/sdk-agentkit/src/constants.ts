/**
 * Constants for AgentKit Lombard Provider
 *
 * Chain ID mappings and supported network definitions.
 * Only chains with BTC.b deployed are included.
 *
 * @see packages/sdk/src/tokens/token-addresses.ts — EVM_BTCB_ADDRESSES
 *
 * @module constants
 */

import { Chain } from '@lombard.finance/sdk';

type ChainId = (typeof Chain)[keyof typeof Chain];

/**
 * Mapping from EVM chain ID (decimal string) to Lombard CAIP-2 Chain identifier.
 *
 * Only includes chains where BTC.b is deployed (production + testnet).
 */
export const CHAIN_ID_TO_LOMBARD_CHAIN: Record<string, ChainId> = {
  '1': Chain.ETHEREUM,
  '43114': Chain.AVALANCHE,
  '747474': Chain.KATANA,
  '4326': Chain.MEGAETH,
  '988': Chain.STABLE,

  // Testnet
  '11155111': Chain.SEPOLIA,
  '43113': Chain.AVALANCHE_FUJI,
} as const;

/**
 * Set of chain IDs supported by the Lombard action provider.
 */
export const SUPPORTED_CHAIN_IDS = new Set(Object.keys(CHAIN_ID_TO_LOMBARD_CHAIN));

/**
 * Human-readable chain names for LLM output.
 */
export const CHAIN_ID_TO_NAME: Record<string, string> = {
  '1': 'Ethereum',
  '43114': 'Avalanche',
  '747474': 'Katana',
  '4326': 'MegaETH',
  '988': 'Stable',
  '11155111': 'Sepolia',
  '43113': 'Avalanche Fuji',
} as const;
