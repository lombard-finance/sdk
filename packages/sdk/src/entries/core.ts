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
  type LogLevel } from '../utils/consoleLogger';

// HTTP utilities
export { getSdkHeaders } from '../utils/http';

// Main SDK exports
export type {
  ApiVersion,
  DepositAddressOptions,
  DestinationChain,
  ExchangeRateOptions,
  UnstakeOptions } from '../client/ApiNamespace';
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
  starknetActions } from '../chains/starknet/StarknetActions';
export { SuiActions, suiActions } from '../chains/sui/SuiActions';

// Shared EVM utilities (fee authorization)
export type { FeeAuthState } from '../chains/evm/shared/feeAuth';

// Status constants
export {
  BtcActionStatus,
  EvmOperationStatus,
  NonEvmOperationStatus } from '../shared/constants/statusConstants';

// Module exports
export { btcModule, type BtcService } from '../modules/btcModule';
export type {
  FeeAuthorizationResult,
  StoredFeeSignature } from '../modules/evmModule';
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
  SuiDestination } from '../shared/context';

// Configuration types
export type {
  CreateConfigOptions,
  CustomAsset,
  LombardConfig,
  LombardSDKOptions,
  PartnerConfig,
  ProviderGetter,
  ProviderGetters } from '../config/types';

// Provider types
export type {
  AnyProvider,
  BtcProvider,
  EvmProvider,
  SolanaProvider,
  StarknetProvider,
  SuiProvider } from '../config/providers';
export {
  isBtcProvider,
  isEvmProvider,
  isSolanaProvider,
  isStarknetProvider,
  isSuiProvider } from '../config/providers';

// Shared types
export type {
  ChainMetadata,
  DeployConfig,
  RouteParams,
  StrategyProgress } from '../core';
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
  isTestnet,
  StepStatus,
  StrategyStatus } from '../core';

// Environment - exported from sdk-common for type consistency
export { Env } from '@lombard.finance/sdk-common';

// Event types
export type {
  BridgeEventMap,
  DeployEventMap,
  DepositEventMap,
  RedeemEventMap,
  StakeEventMap,
  StrategyEvent,
  StrategyEventMap,
  UnstakeEventMap } from '../shared/events';
export {
  BridgeEvent,
  DeployEvent,
  DepositEvent,
  RedeemEvent,
  StakeEvent,
  UnstakeEvent } from '../shared/events';

// Error handling
export {
  ContractErrorCode,
  ErrorCode,
  isLombardError,
  LombardError,
  ProviderErrorCode,
  RegistryErrorCode,
  ValidationErrorCode,
  wrapError } from '../shared/errors';

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
  validateTransactionRequest } from '../clients/evm-signer-adapter';

// RPC URL configuration
export {
  getRpcUrlConfig,
  RPC_URL,
  rpcUrlConfig,
  type TRpcUrlConfig } from '../clients/rpc-url-config';
export {
  type CommonSignerWriteParameters,
  isProviderFlow,
  isSignerFlow } from '../common/parameters';

// Internal utilities
export { makePublicClient } from '../clients/public-client';
export {
  getErrorMessage,
  TokenContractAddressNotFoundError,
  UnsupportedTokenFlow } from '../utils/err';
export { ensureHex, isHex } from '../utils/hex';
export { DAY, HOUR, MINUTE, now, SECOND, toUnix } from '../utils/time';
