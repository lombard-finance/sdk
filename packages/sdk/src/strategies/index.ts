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
  IStrategyPendingRedeem,
  IStrategyPosition,
  IStrategyShards,
  IStrategyState,
} from './lib/types';

// Metrics: dashboard-style reads (on-chain snapshot + backend config).

export {
  getStrategyConfig,
  type GetStrategyConfigParameters,
  normalizeStrategyConfig,
} from './lib/metrics/getStrategyConfig';
export {
  getStrategyState,
  type GetStrategyStateParameters,
} from './lib/metrics/getStrategyState';

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
