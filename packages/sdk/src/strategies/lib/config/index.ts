/**
 * Lombard Strategies config.
 *
 * Env-first model: a caller picks a strategy (`strategyId`, default BTCoc)
 * and an environment (`env`, default `prod`); the chain follows from
 * that pair. There is no flat all-chains list — resolution always goes
 * strategy → env → deployment.
 *
 *  - `strategies/` holds one definition file per strategy (registered in
 *    `registry.ts`);
 *  - `registry.ts` exposes the lookup + resolve helpers.
 */

export {
  DEFAULT_STRATEGY_ID,
  findStaticDepositAsset,
  getStrategyDefinition,
  getStrategyDeployment,
  type ResolvedStrategy,
  resolveStrategy,
  STRATEGIES,
} from './registry';
export type {
  StrategyChainDeployment,
  StrategyDefinition,
  StrategyId,
} from './types';
