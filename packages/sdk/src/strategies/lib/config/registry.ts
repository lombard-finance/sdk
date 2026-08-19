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
 * All per-chain deployments for a strategy in a given environment (usually
 * one). Throws when the strategy is not deployed in that environment.
 */
export function getStrategyDeployments(
  env: Env = DEFAULT_ENV,
  strategyId: StrategyId = DEFAULT_STRATEGY_ID,
): readonly StrategyChainDeployment[] {
  const def = getStrategyDefinition(strategyId);
  const deployments = def.deployments[env];
  if (!deployments || deployments.length === 0) {
    throw new Error(
      `Strategy "${def.id}" is not deployed in env "${env}". Available envs: ${Object.keys(def.deployments).join(', ')}.`,
    );
  }
  return deployments;
}

/** The chains a strategy is deployed on in a given environment. */
export function getStrategyChainIds(
  env: Env = DEFAULT_ENV,
  strategyId: StrategyId = DEFAULT_STRATEGY_ID,
): ChainId[] {
  return getStrategyDeployments(env, strategyId).map((d) => d.chainId);
}

/**
 * Resolves a single deployment for a strategy in a given environment. The
 * environment is the primary selector; `chainId` disambiguates when the env
 * spans multiple chains and defaults to the first (primary) deployment.
 */
export function getStrategyDeployment(
  env: Env = DEFAULT_ENV,
  strategyId: StrategyId = DEFAULT_STRATEGY_ID,
  chainId?: ChainId,
): StrategyChainDeployment {
  const deployments = getStrategyDeployments(env, strategyId);
  if (chainId === undefined) {
    return deployments[0];
  }
  const deployment = deployments.find((d) => d.chainId === chainId);
  if (!deployment) {
    throw new Error(
      `Strategy "${strategyId}" is not deployed on chain ${chainId} in env "${env}". Available chains: ${deployments.map((d) => d.chainId).join(', ')}.`,
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
  /** The resolved (active) chain. */
  chainId: ChainId;
  /** All chains the strategy is deployed on in this environment. */
  chainIds: ChainId[];
  /** Contract address to target (explicit override wins over the default). */
  address: Address;
  abi: Abi;
  decimals: number;
  depositAssets: ReadonlyArray<IStrategyDepositAssetStatic>;
}

/**
 * Resolves a strategy + environment (+ optional chain selector + explicit
 * address override) into the concrete deployment context used by the ops and
 * metrics helpers. `chainId` defaults to the environment's primary chain.
 */
export function resolveStrategy(params: {
  env?: Env;
  strategyId?: StrategyId;
  strategy?: Address;
  chainId?: ChainId;
}): ResolvedStrategy {
  const env = params.env ?? DEFAULT_ENV;
  const strategyId = params.strategyId ?? DEFAULT_STRATEGY_ID;
  const def = getStrategyDefinition(strategyId);
  const deployment = getStrategyDeployment(env, strategyId, params.chainId);

  return {
    strategyId,
    env,
    chainId: deployment.chainId,
    chainIds: getStrategyChainIds(env, strategyId),
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
