/**
 * EVM Chain Switching Utility
 *
 * Helper to ensure wallet is on the correct chain before signing.
 * Uses EIP-3326 (wallet_switchEthereumChain) and EIP-3085 (wallet_addEthereumChain).
 *
 * @module shared/evm/switchChain
 */

import type { EIP1193Provider } from 'viem';

import { addChain, type ChainId } from '../../common/chains';
import { LombardError, ValidationErrorCode } from '../errors';

/**
 * Request to switch wallet to the target chain
 * If chain is not available, attempts to add it first.
 *
 * @param provider - EIP-1193 provider
 * @param targetChainId - Chain ID to switch to
 * @throws LombardError if chain switching fails
 */
export async function requestChainSwitch(
  provider: EIP1193Provider,
  targetChainId: ChainId,
): Promise<void> {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChainId.toString(16)}` }] });
  } catch (error) {
    const err = error as { code?: number; message?: string };

    // 4902 = chain not added - try to add it automatically
    if (err.code === 4902) {
      try {
        await addChain({ provider, chainId: targetChainId });
        // After adding, try to switch again
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }] });
        return;
      } catch (addError) {
        const addErr = addError as { code?: number; message?: string };

        // User rejected adding chain
        if (addErr.code === 4001) {
          throw new LombardError(
            ValidationErrorCode.INVALID_PARAMETER,
            'User rejected adding chain to wallet.',
          );
        }

        throw new LombardError(
          ValidationErrorCode.INVALID_CHAIN,
          `Failed to add chain ${targetChainId} to wallet: ${addErr.message || 'Unknown error'}`,
        );
      }
    }

    // User rejected
    if (err.code === 4001) {
      throw new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        'User rejected chain switch request.',
      );
    }

    throw new LombardError(
      ValidationErrorCode.INVALID_CHAIN,
      `Failed to switch to chain ${targetChainId}: ${err.message || 'Unknown error'}`,
    );
  }
}

/**
 * Get current chain ID from wallet
 *
 * @param provider - EIP-1193 provider
 * @returns Current chain ID as number
 */
export async function getCurrentChainId(
  provider: EIP1193Provider,
): Promise<number> {
  const chainIdHex = (await provider.request({
    method: 'eth_chainId' })) as string;
  return parseInt(chainIdHex, 16);
}

/**
 * Ensure wallet is on the correct chain, switching if necessary
 *
 * @param provider - EIP-1193 provider
 * @param targetChainId - Required chain ID
 * @throws LombardError if chain switching fails
 */
export async function ensureCorrectChain(
  provider: EIP1193Provider,
  targetChainId: ChainId,
): Promise<void> {
  const currentChainId = await getCurrentChainId(provider);

  if (currentChainId !== targetChainId) {
    await requestChainSwitch(provider, targetChainId);
  }
}
