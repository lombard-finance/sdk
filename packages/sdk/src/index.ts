/**
 * Lombard SDK - Public API
 *
 * Main entry point for the Lombard SDK.
 */

// SDK Version (injected at build time)
export { SDK_NAME, SDK_RUNTIME, SDK_VERSION } from './version';

// Logging utilities
export {
type ConsoleLoggerOptions,   createConsoleLogger,
  createSilentLogger, type LogLevel
} from './utils/consoleLogger';

// HTTP utilities (for advanced users)
export { getSdkHeaders } from './utils/http';

// Main SDK exports
export type {
  ApiVersion,
  DepositAddressOptions,
  DestinationChain,
  ExchangeRateOptions,
  UnstakeOptions
} from './client/ApiNamespace';
export { ApiNamespace } from './client/ApiNamespace';
export { createConfig } from './client/createConfig';
export { createLombardSDK } from './client/createLombardSDK';
export { LombardSDK } from './client/LombardSDK';
export { PartnerConfiguration } from './client/PartnerConfiguration';

// Chain Actions (user-facing API)
export { BtcActions, btcActions } from './chains/btc/BtcActions';
export { EvmActions, evmActions } from './chains/evm/EvmActions';
export { SolanaActions, solanaActions } from './chains/solana/SolanaActions';
export {
  StarknetActions,
  starknetActions
} from './chains/starknet/StarknetActions';
export { SuiActions, suiActions } from './chains/sui/SuiActions';

// Shared EVM utilities (fee authorization)
export type { FeeAuthState } from './chains/evm/shared/feeAuth';

// Status constants (single export to avoid duplicates)
export {
  BtcActionStatus,
  EvmOperationStatus,
  NonEvmUnstakeStatus
} from './shared/constants/statusConstants';

// Module exports
export { btcModule, type BtcService } from './modules/btcModule';
export type {
  FeeAuthorizationResult,
  StoredFeeSignature
} from './modules/evmModule';
export { evmModule, type EvmService } from './modules/evmModule';

// Context types
export type {
  BtcCoreContext,
  CoreContext,
  EvmCoreContext,
  EvmDestination,
  Logger,
  ProviderKey,
  ProviderResolver,
  SolanaDestination,
  StarknetDestination,
  SuiDestination
} from './shared/context';

// Configuration types
export type {
  CreateConfigOptions,
  CustomAsset,
  LombardConfig,
  LombardSDKOptions,
  PartnerConfig,
  ProviderGetter,
  ProviderGetters
} from './config/types';

// Provider types
export type {
  AnyProvider,
  BtcProvider,
  EvmProvider,
  SolanaProvider,
  StarknetProvider,
  SuiProvider
} from './config/providers';
export {
  isBtcProvider,
  isEvmProvider,
  isSolanaProvider,
  isStarknetProvider,
  isSuiProvider
} from './config/providers';

// Shared types
export type { ChainMetadata, DeployConfig, RouteParams, StrategyProgress } from './core';
export {
  AssetId,
  assetValueToKey, Chain,
  // Chain utility functions
  CHAIN_CATALOG, chainValueToKey, DeployProtocol,
  Env, evmChainIdToChain,
  getAllAssetChains,
  getAssetAddress,
  // Asset utility functions for dynamic chain discovery
  getAssetChains,
  getAssetChainsForEnvs,
  getChainMetadata,
  getChainName,
  isAssetDeployed,
  isAssetId,
  isChain,
  isEvmChain,
  isMainnet,
  isTestnet,
  StepStatus,
  StrategyStatus
} from './core';

// Event types
export type {
  BridgeEventMap,
  DeployEventMap,
  DepositEventMap,
  RedeemEventMap,
  StakeEventMap,
  StrategyEvent,
  StrategyEventMap,
  UnstakeEventMap
} from './shared/events';
export {
  BridgeEvent,
  DeployEvent,
  DepositEvent,
  RedeemEvent,
  StakeEvent,
  UnstakeEvent
} from './shared/events';

// Error handling
export {
  ContractErrorCode,
  ErrorCode, isLombardError, LombardError,
  ProviderErrorCode,
  RegistryErrorCode,
  ValidationErrorCode, wrapError
} from './shared/errors';

// Action interfaces
export type { LogMeta, MonitorableAction } from './shared/actions/BaseAction';

// BTC types and direct actions
export type {
  BtcDepositAndDeployParams,
  BtcDepositAndDeployPrepareParams,
  BtcDepositAndDeployProgress,
  BtcDepositParams,
  BtcDepositPrepareParams,
  BtcDepositProgress,
  BtcStakeAndDeployParams,
  BtcStakeAndDeployPrepareParams,
  BtcStakeAndDeployProgress,
  BtcStakeParams,
  BtcStakeProgress,
  IBtcDeposit,
  IBtcDepositAndDeploy,
  IBtcStake,
  IBtcStakeAndDeploy
} from './chains/btc';
export {
  BtcDeposit,
  BtcDepositAndDeploy,
  BtcStake,
  BtcStakeAndDeploy
} from './chains/btc';

// Note: Sync factory functions (btcStake, btcDeposit, etc.) are intentionally
// not exported. Use createLombardSDK() instead:
//
//   const sdk = await createLombardSDK({ env: Env.prod, ... });
//   const stake = sdk.chain.btc.stake({ ... });
//
// This ensures consistent behavior when remote catalog fetching is added in v4.1.

// EVM types and direct actions
export type {
  EvmDeployParams,
  EvmDeployPrepareParams,
  EvmDeployProgress,
  EvmDepositParams,
  EvmDepositPrepareParams,
  EvmDepositProgress,
  EvmRedeemParams,
  EvmRedeemPrepareParams,
  EvmRedeemProgress,
  EvmStakeParams,
  EvmStakePrepareParams,
  EvmStakeProgress,
  EvmUnstakeParams,
  EvmUnstakePrepareParams,
  EvmUnstakeProgress,
  IEvmDeploy,
  IEvmDeposit,
  IEvmRedeem,
  IEvmStake,
  IEvmUnstake
} from './chains/evm';
export {
  EvmDeployStatus,
  EvmDepositStatus,
  EvmRedeemStatus,
  EvmStakeStatus,
  EvmUnstakeStatus
} from './chains/evm';

// Note: Sync factory functions (evmStake, evmUnstake, etc.) are intentionally
// not exported. Use createLombardSDK() instead:
//
//   const sdk = await createLombardSDK({ env: Env.prod, ... });
//   const unstake = sdk.chain.evm.unstake({ ... });

// Utils:
export * from './common/api-config';
export * from './common/blockchain-identifier';
export * from './common/chains';
export * from './common/fee-requirements';

// Token utilities
export * from './tokens/lbtc-addresses';
export * from './tokens/token-addresses';
export * from './tokens/tokens';
export * from './utils/satoshi';

// DeFi registry
export * from './defi';

// Metrics:
export {
  getAdditionalRewards,
  type RewardsDistribution
} from './metrics/get-additional-rewards';
export {
  getApy,
  getEstimatedApy,
  type LbtcApy,
  type LbtcEstimatedApy
} from './metrics/get-lbtc-apy';
export { getLBTCStats } from './metrics/get-lbtc-stats';
export {
  getPositionsSummary,
  type PositionsSummary
} from './metrics/get-positions-summary';

// Referrals
export { ReferralsClient } from './referrals';
export type {
  ReferralLookupParams,
  ReferralLookupResult
} from './referrals/ReferralsClient';

// API response types
export type { Deposit } from './api-functions/getDepositsByAddress/getDepositsByAddress';
export type { Unstake } from './api-functions/getUnstakesByAddress/getUnstakesByAddress';
export { PayoutTxStatus } from './api-functions/getUnstakesByAddress/getUnstakesByAddress';

// Deposit status utilities
export {
  calcConfirmations, type ConfirmationProgress, depositRequiresAction, type DepositStatus,
  type DepositStatusDisplay, getConfirmationProgress,
  getDepositStatus,
  getDepositStatusDisplay,
  isDepositClaimable,
  isDepositPending,
  isDepositTerminal, MIN_CLAIM_AMOUNT_BTC,
  REQUIRED_CONFIRMATIONS, type StatusSeverity
} from './shared/deposits';

// External types
export type { Address, EIP1193Provider } from 'viem';

// Contract/API functions
export * from './api-functions';
export * from './contract-functions';

// Vault:
export * from './vaults';

// Signer support (custom transaction signing):
export {
  createAccountFromSigner,
  createWalletClientFromSigner, type DispatchCallback,
  type EvmTransactionRequest,
  type SignerAdapter,
SignerError, validateTransactionRequest} from './clients/evm-signer-adapter';

// RPC URL configuration (for wagmi/viem setup):
export {
  getRpcUrlConfig,
  RPC_URL,
  rpcUrlConfig,
  type TRpcUrlConfig
} from './clients/rpc-url-config';
export {
type CommonSignerWriteParameters,
  isProviderFlow,
  isSignerFlow} from './common/parameters';

// Bridge:
export {
  bridge,
  bridgeCCIP, type BridgeCCIPParameters, bridgeOFT, type BridgeParameters,
getBridgeInfo, OFT_GAS_LIMIT,
  OFT_HI_GAS_LIMIT,
  OFT_HI_GAS_LIMIT_CHAINS} from './bridge';

// Debug:
export * from './debug-api';

// Internal utilities (used by apps/main):
export { makePublicClient } from './clients/public-client';
export {
  getErrorMessage,
  TokenContractAddressNotFoundError,
  UnsupportedTokenFlow
} from './utils/err';
export { ensureHex, isHex } from './utils/hex';
export { DAY, HOUR, MINUTE, now, SECOND, toUnix } from './utils/time';

