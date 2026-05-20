/**
 * Strategy module - Lombard DeFi Vault Strategy (Bitcoin Stretch).
 *
 * Multi-asset, async-redeem vault contract that issues ERC-20 shares.
 * Distinct from the Veda Teller-based BTCe vault exposed under
 * `@lombard.finance/sdk/vaults`; do not conflate the two.
 *
 * Import from `'@lombard.finance/sdk/strategies'`.
 */

export {
  depositStrategy,
  type DepositStrategyParameters,
  findStaticDepositAsset,
  getDefaultStrategyAddress,
  getStrategyConfig,
  type GetStrategyConfigParameters,
  getStrategyDepositAssets,
  type GetStrategyDepositAssetsParameters,
  getStrategyPendingRedeem,
  type GetStrategyPendingRedeemParameters,
  getStrategyPosition,
  type GetStrategyPositionParameters,
  getStrategyShards,
  type GetStrategyShardsParameters,
  getStrategyState,
  type GetStrategyStateParameters,
  type IRequestStrategyRedeemResult,
  isLombardStrategyChain,
  type IStrategyAllocationRow,
  type IStrategyBaseAsset,
  type IStrategyConfigResponse,
  type IStrategyDepositAsset,
  type IStrategyDepositAssetStatic,
  type IStrategyFeeConfig,
  type IStrategyPendingRedeem,
  type IStrategyPosition,
  type IStrategyShards,
  type IStrategyState,
  LOMBARD_STRATEGY,
  LOMBARD_STRATEGY_CHAINS,
  LOMBARD_STRATEGY_CONTRACTS,
  LOMBARD_STRATEGY_DECIMALS,
  LOMBARD_STRATEGY_DEPOSIT_ASSETS,
  type LombardStrategyChain,
  normalizeStrategyConfig,
  previewStrategyDeposit,
  type PreviewStrategyDepositParameters,
  requestStrategyRedeem,
  type RequestStrategyRedeemParameters,
} from '../strategies';
