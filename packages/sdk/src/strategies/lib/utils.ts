import { Address } from 'viem';

import {
  getDefaultStrategyAddress,
  isLombardStrategyChain,
  LOMBARD_STRATEGY_CHAINS,
  LombardStrategyChain,
} from './config';

/**
 * Throws a consistent error when `chainId` is not a supported Lombard
 * Strategy chain, and narrows the type for downstream code so chain-keyed
 * lookups (e.g. `LOMBARD_STRATEGY_CONTRACTS`,
 * `LOMBARD_STRATEGY_DEPOSIT_ASSETS`) do not require manual casts.
 */
export function assertLombardStrategyChain(
  chainId: number,
): asserts chainId is LombardStrategyChain {
  if (!isLombardStrategyChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Lombard Strategy is supported on: ${LOMBARD_STRATEGY_CHAINS.join(', ')}.`,
    );
  }
}

/**
 * Resolves the Strategy contract address: explicit `strategy` argument wins,
 * otherwise the canonical address for the chain is used.
 */
export function resolveStrategyAddress(
  chainId: LombardStrategyChain,
  strategy?: Address,
): Address {
  return strategy ?? getDefaultStrategyAddress(chainId);
}
