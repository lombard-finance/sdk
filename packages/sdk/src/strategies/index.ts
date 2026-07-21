// Config

export {
  DEFAULT_STRATEGY_ID,
  findStaticDepositAsset,
  getStrategyChainIds,
  getStrategyDefinition,
  getStrategyDeployment,
  getStrategyDeployments,
  type ResolvedStrategy,
  resolveStrategy,
  STRATEGIES,
  type StrategyChainDeployment,
  type StrategyDefinition,
  type StrategyId,
} from './lib/config';
export type {
  StrategyBaseParameters,
  StrategyReadParameters,
  StrategyWriteParameters,
} from './lib/params';
// Types

export type {
  IRequestStrategyRedeemResult,
  IStrategyAllocationRow,
  IStrategyBaseAsset,
  IStrategyConfigResponse,
  IStrategyDepositAsset,
  IStrategyDepositAssetStatic,
  IStrategyFeeConfig,
  IStrategyNavSnapshot,
  IStrategyPendingRedeem,
  IStrategyPosition,
  IStrategyRatesSnapshot,
  IStrategyShards,
  IStrategyState,
  IStrategyUserActivityEntry,
  IStrategyUserActivityFeed,
  IStrategyUserPosition,
  IStrategyUserPositionSnapshot,
  IStrategyUserWithdrawalRequest,
} from './lib/types';

// Metrics: dashboard-style reads (on-chain snapshot + backend config).

export {
  getStrategyNavHistory,
  type GetStrategyNavHistoryParameters,
} from './lib/metrics/getStrategyNavHistory';
export {
  getStrategyRatesHistory,
  type GetStrategyRatesHistoryParameters,
} from './lib/metrics/getStrategyRatesHistory';
export {
  getStrategyState,
  type GetStrategyStateParameters,
} from './lib/metrics/getStrategyState';
export {
  getUserActivityFeed,
  type GetUserActivityFeedParameters,
} from './lib/metrics/getUserActivityFeed';
export {
  getStrategyUserPosition,
  type GetUserPositionParameters,
} from './lib/metrics/getUserPosition';
export {
  getUserPositionHistory,
  type GetUserPositionHistoryParameters,
} from './lib/metrics/getUserPositionHistory';
export {
  getUserWithdrawals,
  type GetUserWithdrawalsParameters,
} from './lib/metrics/getUserWithdrawals';
export { UnauthorizedWalletJwtError } from './lib/metrics/userEndpoints';

// Ops: actions and per-user reads.

export {
  depositStrategy,
  type DepositStrategyParameters,
} from './lib/ops/depositStrategy';
export {
  getStrategyDepositAssets,
  type GetStrategyDepositAssetsParameters,
} from './lib/ops/getStrategyDepositAssets';
export {
  getStrategyPendingRedeem,
  type GetStrategyPendingRedeemParameters,
} from './lib/ops/getStrategyPendingRedeem';
export {
  getStrategyPosition,
  type GetStrategyPositionParameters,
} from './lib/ops/getStrategyPosition';
export {
  getStrategyShards,
  type GetStrategyShardsParameters,
} from './lib/ops/getStrategyShards';
export {
  previewStrategyDeposit,
  type PreviewStrategyDepositParameters,
} from './lib/ops/previewStrategyDeposit';
export {
  requestStrategyRedeem,
  type RequestStrategyRedeemParameters,
} from './lib/ops/requestStrategyRedeem';
