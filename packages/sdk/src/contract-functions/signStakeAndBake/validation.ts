/**
 * Validation utilities for stake and bake operations.
 * Provides early validation with descriptive error messages.
 */

import { Env } from '@lombard.finance/sdk-common';

import type { ChainId } from '../../common/chains';
import {
  DEFI_REGISTRY,
  DefiProtocol,
  StakeAndBakeStrategy,
  StakeAndBakeToken,
} from '../../defi/defi-registry';

/**
 * Custom error for stake and bake validation failures.
 * Includes error code and context for better debugging.
 */
export class StakeAndBakeValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'StakeAndBakeValidationError';
  }
}

/**
 * Validates stake and bake parameters and returns the strategy for the requested combo.
 * Throws StakeAndBakeValidationError for invalid combinations.
 *
 * @param vaultKey - The vault to stake into
 * @param token - The token to stake
 * @param chainId - The chain ID
 * @param env - The environment (prod, testnet, etc.)
 * @returns TokenApprovalConfig and spenderContract
 * @throws {StakeAndBakeValidationError} If vault/token/chain/env combination is invalid
 */
export function getStakeAndBakeConfig(
  vaultKey: DefiProtocol,
  token: StakeAndBakeToken,
  chainId: ChainId,
  env: Env,
): StakeAndBakeStrategy {
  // Get token approval config from DeFi registry
  const vaultRegistry = DEFI_REGISTRY[vaultKey];
  if (!vaultRegistry) {
    throw new StakeAndBakeValidationError(
      'UNSUPPORTED_VAULT',
      `Vault ${vaultKey} not found in DeFi registry`,
      { vaultKey },
    );
  }

  const tokenRegistry = vaultRegistry[token as keyof typeof vaultRegistry];
  if (!tokenRegistry) {
    throw new StakeAndBakeValidationError(
      'UNSUPPORTED_TOKEN',
      `Token ${token} is not supported for stake and bake on vault ${vaultKey}. ` +
        `Supported tokens: ${Object.keys(vaultRegistry).join(', ')}`,
      { vaultKey, token, supportedTokens: Object.keys(vaultRegistry) },
    );
  }

  const envRegistry = tokenRegistry[env];
  if (!envRegistry) {
    throw new StakeAndBakeValidationError(
      'UNSUPPORTED_ENV',
      `Environment ${env} is not supported for token ${token} on vault ${vaultKey}`,
      { vaultKey, token, env },
    );
  }

  const registryEntry = envRegistry[chainId as keyof typeof envRegistry];
  if (!registryEntry) {
    throw new StakeAndBakeValidationError(
      'UNSUPPORTED_TOKEN_CHAIN',
      `Token ${token} is not supported on chain ${chainId} for vault ${vaultKey} in ${env}. ` +
        `Supported chains: ${Object.keys(envRegistry).join(', ')}`,
      {
        vaultKey,
        token,
        chainId,
        env,
        supportedChains: Object.keys(envRegistry),
      },
    );
  }

  return {
    protocol: vaultKey,
    token,
    env,
    chainId,
    ...registryEntry,
  };
}

/**
 * Checks if a token approval config exists for a given vault/token/chain/env combination.
 * Useful for determining if config-driven logic should be used.
 *
 * @param vaultKey - The vault to check
 * @param token - The token to check
 * @param chainId - The chain ID to check
 * @param env - The environment to check
 * @returns true if config exists, false otherwise
 */
export function hasTokenApprovalConfig(
  vaultKey: DefiProtocol,
  token: StakeAndBakeToken,
  chainId: ChainId,
  env: Env,
): boolean {
  try {
    const config = getStakeAndBakeConfig(vaultKey, token, chainId, env);
    return config !== undefined;
  } catch {
    return false;
  }
}
