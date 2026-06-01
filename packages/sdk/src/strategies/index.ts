// Config

export {
  findStaticDepositAsset,
  getDefaultStrategyAddress,
  isLombardStrategyChain,
  LOMBARD_STRATEGY,
  LOMBARD_STRATEGY_CHAINS,
  LOMBARD_STRATEGY_CONTRACTS,
  LOMBARD_STRATEGY_DECIMALS,
  LOMBARD_STRATEGY_DEPOSIT_ASSETS,
  type LombardStrategyChain,
} from './lib/config';
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
  IStrategyUserPosition,
  IStrategyUserPositionSnapshot,
  IStrategyUserWithdrawalRequest,
} from './lib/types';

// Metrics: dashboard-style reads (on-chain snapshot + backend config).

export {
  getStrategyConfig,
  type GetStrategyConfigParameters,
  normalizeStrategyConfig,
} from './lib/metrics/getStrategyConfig';
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
  getUserPosition,
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
