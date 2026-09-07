/**
 * Core SDK exports - SDK creation, configuration, and fundamental types
 *
 * Import from '@lombard.finance/sdk/core' for minimal bundle size when you only
 * need SDK initialization and configuration.
 */

// SDK Version
export { SDK_NAME, SDK_RUNTIME, SDK_VERSION } from '../version';

// Logging utilities
export {
  type ConsoleLoggerOptions,
  createConsoleLogger,
  createSilentLogger,
  type LogLevel,
} from '../utils/consoleLogger';

// HTTP utilities
export { getSdkHeaders } from '../utils/http';

// Main SDK exports
export type {
  ApiVersion,
  DepositAddressOptions,
  DestinationChain,
  ExchangeRateOptions,
  WithdrawalOptions,
} from '../client/ApiNamespace';
export { ApiNamespace } from '../client/ApiNamespace';
export { createConfig } from '../client/createConfig';
export { createLombardSDK } from '../client/createLombardSDK';
export { LombardSDK } from '../client/LombardSDK';
export { PartnerConfiguration } from '../client/PartnerConfiguration';

// Chain Actions (user-facing API)
export { BtcActions, btcActions } from '../chains/btc/BtcActions';
export { EvmActions, evmActions } from '../chains/evm/EvmActions';
export { SolanaActions, solanaActions } from '../chains/solana/SolanaActions';
export {
  StarknetActions,
  starknetActions,
} from '../chains/starknet/StarknetActions';
export { SuiActions, suiActions } from '../chains/sui/SuiActions';

// Shared EVM utilities (fee authorization)
export type { FeeAuthState } from '../chains/evm/shared/feeAuth';

// Status constants
export {
  BtcActionStatus,
  EvmOperationStatus,
  NonEvmOperationStatus,
} from '../shared/constants/statusConstants';

// Module exports
export { btcModule, type BtcService } from '../modules/btcModule';
export type {
  FeeAuthorizationResult,
  StoredFeeSignature,
} from '../modules/evmModule';
export { evmModule, type EvmService } from '../modules/evmModule';

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
  SuiDestination,
} from '../shared/context';

// Configuration types
export type {
  CreateConfigOptions,
  CustomAsset,
  LombardConfig,
  LombardSDKOptions,
  PartnerConfig,
  ProviderGetter,
  ProviderGetters,
} from '../config/types';

// Provider types
export type {
  AnyProvider,
  BtcProvider,
  EvmProvider,
  SolanaProvider,
  StarknetProvider,
  SuiProvider,
} from '../config/providers';
export {
  isBtcProvider,
  isEvmProvider,
  isSolanaProvider,
  isStarknetProvider,
  isSuiProvider,
} from '../config/providers';

// Shared types
export type {
  ChainMetadata,
  DeployConfig,
  RouteParams,
  StrategyProgress,
} from '../core';
export {
  AssetId,
  assetValueToKey,
  Chain,
  CHAIN_CATALOG,
  chainValueToKey,
  DeployProtocol,
  evmChainIdToChain,
  getAllAssetChains,
  getAssetAddress,
  getAssetChains,
  getAssetChainsForEnvs,
  getChainMetadata,
  getChainName,
  isAssetDeployed,
  isAssetId,
  isChain,
  isEvmChain,
  isMainnet,
  isRetiredChain,
  isTestnet,
  RETIRED_CHAINS,
  StepStatus,
  StrategyStatus,
} from '../core';

// Environment - exported from sdk-common for type consistency
export { Env } from '@lombard.finance/sdk-common';

// Event types
export type {
  ActionEventMap,
  StrategyEvent,
  StrategyEventHandlerMap,
  StrategyEventMap,
} from '../shared/events';
export { ActionEvent } from '../shared/events';

// Error handling
export {
  ContractErrorCode,
  ErrorCode,
  isLombardError,
  LombardError,
  ProviderErrorCode,
  RegistryErrorCode,
  ValidationErrorCode,
  wrapError,
} from '../shared/errors';

// Action interfaces
export type { LogMeta, MonitorableAction } from '../shared/actions/BaseAction';

// External types
export type { Address, EIP1193Provider } from 'viem';

// Signer support
export {
  createAccountFromSigner,
  createWalletClientFromSigner,
  type DispatchCallback,
  type EvmTransactionRequest,
  type SignerAdapter,
  SignerError,
  validateTransactionRequest,
} from '../clients/evm-signer-adapter';

// RPC URL configuration
export {
  getRpcUrlConfig,
  RPC_URL,
  rpcUrlConfig,
  type TRpcUrlConfig,
} from '../clients/rpc-url-config';
export {
  type CommonSignerWriteParameters,
  isProviderFlow,
  isSignerFlow,
} from '../common/parameters';

// Internal utilities
export { makePublicClient } from '../clients/public-client';
export {
  getErrorMessage,
  TokenContractAddressNotFoundError,
  UnsupportedTokenFlow,
} from '../utils/err';
export { ensureHex, isHex } from '../utils/hex';
export { DAY, HOUR, MINUTE, now, SECOND, toUnix } from '../utils/time';

// ── The v6 action contract (§5 of the redesign) ──
//
// Exported from the root and from `./core` so a consumer can name a status, a
// step or a route without reaching into the package. Without this the whole
// contract compiles, is tested, and is unreachable — which is exactly what
// happened until the playground tried to import it.
export type {
  Action,
  ActionNamespace,
  ActionProgress,
  ActionResult,
  ActionStepKey,
  ActionSteps,
  ActionTxHashes,
  AuthorizationGroup,
  AuthorizationStatus,
  BitcoinSourceAction,
  BtcDeployStatus,
  BtcDepositStatus,
  CancellableAction,
  ClaimableAction,
  DeployAsset,
  DeployNamespace,
  DeployParams,
  DepositParams,
  EvmCancelWithdrawStatus,
  // EvmClaimStatus and EvmDeployStatus are deliberately absent. Each name is
  // already taken by a v5 alias of EvmOperationStatus, and the v6 narrowing
  // describes the same concept with a smaller member set. Exporting both is a
  // duplicate identifier, and silently swapping which one wins would change what
  // a consumer's type admits with no error at their call site. They land when
  // the EVM classes adopt the narrowings, as a named breaking change.
  //
  // EvmDepositStatus and EvmWithdrawStatus are here for the first time: those
  // names used to be taken by the per-action aliases, and the class rename
  // freed them.
  EvmDepositStatus,
  EvmVaultWithdrawStatus,
  EvmWithdrawStatus,
  FeeAuthorizedAction,
  PrepareParams,
  ReachableActionStatus,
  RouteLabel,
  RouteLabelParams,
  ShareAmount,
  SolanaDepositStatus,
  SolanaWithdrawStatus,
  StarknetWithdrawStatus,
  SubmitProgress,
  SuiWithdrawStatus,
  TerminalStatus,
  WithdrawParams,
} from '../core/actions';
export {
  ACTION_STEP_KEYS,
  ActionStatus,
  AUTHORIZATION_STATUSES,
  deriveRouteLabel,
  isAddressResult,
  isAuthorizationStatus,
  isTerminalStatus,
  isTxResult,
  REGISTRY_TOKEN_ROWS,
  resolveRegistryToken,
  shares,
  TERMINAL_STATUSES,
  vaultAsset,
} from '../core/actions';

// ── The wallet-auth transport contract ──
//
// Re-exported from `sdk-common` so a consumer can type an `auth` provider
// without depending on `sdk-common` directly. `LombardConfig.auth` is typed as
// `LombardAuth`, so a consumer that cannot name the type cannot implement it.
export type {
  AuthRequestContext,
  LombardAuth,
  RequestScope,
} from '@lombard.finance/sdk-common';

// ── Wallet-auth chain names ──
//
// The auth routes name chains a fourth way (the short `/v2/chains` name), so
// this derives it rather than leaving each consumer to hand-write the table.
export {
  walletAuthChainName,
  walletAuthChainNames,
} from '../common/wallet-auth-chain';

// The one-call sign-in ceremony and its parameter types.
export type {
  WalletSignInParams,
  WalletSignInResult,
  WalletSignResult,
} from '@lombard.finance/sdk-common';
