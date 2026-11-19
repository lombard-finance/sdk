/**
 * Network fee requirement utilities
 *
 * Determines which chains require network fee authorization for auto-minting.
 */

import type { ChainId } from './chains';

/**
 * Chains that require network fee authorization (auto-mint fee)
 *
 * Ethereum mainnet and Sepolia (testnet) can require fee authorization.
 * Other chains (Base, BSC, etc.) never require it.
 *
 * On these chains a mint still needs the approval only while its token
 * contract predates the deposit fee; the SDK's own flows read that from the
 * contract (`getDepositFee()`) before asking for a signature.
 */
export const AUTO_MINT_FEE_CHAINS: readonly ChainId[] = [
  1, // Ethereum mainnet
  11155111, // Sepolia (testnet/stage)
] as const;

/**
 * Check if a chain requires network fee authorization
 *
 * @param chainId - The chain ID to check
 * @returns True if the chain requires fee authorization
 *
 * @example
 * ```ts
 * requiresAutoMintFee(1) // true (Ethereum)
 * requiresAutoMintFee(8453) // false (Base)
 * ```
 */
export function requiresAutoMintFee(chainId: ChainId): boolean {
  return AUTO_MINT_FEE_CHAINS.includes(chainId);
}
