import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import { Abi, Address } from 'viem';

import { ChainId } from '../../../common/chains';
import { IStrategyDepositAssetStatic } from '../types';
import { BTCOC } from './strategies/btcoc';
import {
  StrategyChainDeployment,
  StrategyDefinition,
  StrategyId,
} from './types';

/**
 * Registry of all Lombard Strategies, keyed by strategy id. Add a new strategy
 * by dropping a definition file under `config/strategies/` and registering it
 * here.
 */
export const STRATEGIES: Record<StrategyId, StrategyDefinition> = {
  [BTCOC.id]: BTCOC,
};

/**
 * Default strategy id, used when a caller does not name a strategy explicitly.
 * There is currently only one strategy (BTCoc).
 */
export const DEFAULT_STRATEGY_ID: StrategyId = BTCOC.id;

/** Looks up a strategy definition, throwing on an unknown id. */
export function getStrategyDefinition(
  strategyId: StrategyId = DEFAULT_STRATEGY_ID,
): StrategyDefinition {
  const def = STRATEGIES[strategyId];
  if (!def) {
    throw new Error(
      `Unknown strategy id: "${strategyId}". Known strategies: ${Object.keys(STRATEGIES).join(', ')}.`,
    );
  }
  return def;
}

/**
 * Resolves the deployment for a strategy in a given environment. The
 * environment is the selector; the chain follows from it. Throws when the
 * strategy is not deployed in that environment rather than silently falling
 * back to another chain.
 */
export function getStrategyDeployment(
  env: Env = DEFAULT_ENV,
  strategyId: StrategyId = DEFAULT_STRATEGY_ID,
): StrategyChainDeployment {
  const def = getStrategyDefinition(strategyId);
  const deployment = def.deployments[env];
  if (!deployment) {
    throw new Error(
      `Strategy "${def.id}" is not deployed in env "${env}". Available envs: ${Object.keys(def.deployments).join(', ')}.`,
    );
  }
  return deployment;
}

/**
 * Everything an SDK call needs after picking a strategy + environment: the
 * resolved chain, contract address (honoring an explicit override), ABI,
 * decimals, and the static deposit-asset catalog.
 */
export interface ResolvedStrategy {
  strategyId: StrategyId;
  env: Env;
  chainId: ChainId;
  /** Contract address to target (explicit override wins over the default). */
  address: Address;
  abi: Abi;
  decimals: number;
  depositAssets: ReadonlyArray<IStrategyDepositAssetStatic>;
}

/**
 * Resolves a strategy + environment (+ optional explicit address override)
 * into the concrete deployment context used by the ops and metrics helpers.
 */
export function resolveStrategy(params: {
  env?: Env;
  strategyId?: StrategyId;
  strategy?: Address;
}): ResolvedStrategy {
  const env = params.env ?? DEFAULT_ENV;
  const strategyId = params.strategyId ?? DEFAULT_STRATEGY_ID;
  const def = getStrategyDefinition(strategyId);
  const deployment = getStrategyDeployment(env, strategyId);

  return {
    strategyId,
    env,
    chainId: deployment.chainId,
    address: params.strategy ?? deployment.contract,
    abi: def.abi,
    decimals: def.decimals,
    depositAssets: deployment.depositAssets,
  };
}

/**
 * Finds a static deposit-asset catalog entry by token address,
 * case-insensitively. Pass the `depositAssets` list from a resolved
 * deployment (`resolveStrategy(...).depositAssets`).
 */
export function findStaticDepositAsset(
  depositAssets: ReadonlyArray<IStrategyDepositAssetStatic>,
  asset: Address,
): IStrategyDepositAssetStatic | undefined {
  const lower = asset.toLowerCase();
  return depositAssets.find((a) => a.token.toLowerCase() === lower);
}
