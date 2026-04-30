/**
 * Module System Exports
 *
 * Modules provide service implementations using the Service-First pattern:
 * - Service interfaces define the contract (in sdk-common)
 * - Service classes implement the interfaces (in services/)
 * - Module factories instantiate services with context
 *
 * Module Types:
 * - SdkModule: Generic module (e.g., apiModule) - for non-chain services
 * - ChainModule: Chain-specific module (e.g., btcModule, evmModule)
 *
 * Service Types:
 * - Internal services: Minimal types, for action DI (not exposed publicly)
 * - Public APIs: Rich types, for user-facing methods (sdk.deposits.*, etc.)
 *
 * @module modules
 */

export { CapabilityRegistry } from './CapabilityRegistry';

// BTC Module (chain-specific)
export { btcModule, BtcService } from './btcModule';

// EVM Module (chain-specific)
export type {
  EvmChainId,
  FeeAuthorizationResult,
  StoredFeeSignature } from './evmModule';
export { evmModule, EvmService } from './evmModule';

// API Module (generic SDK module, not chain-specific)
export type {
  DepositInfo,
  GenerateDepositAddressParams,
  GetDepositAddressParams } from './apiModule';
export { apiModule, ApiService } from './apiModule';

// Module types from sdk-common
export type {
  // Any module
  AnyModule,
  // Chain-specific module type
  ChainModule,
  ModuleId,
  // Helper types
  RegisterContext,
  // Generic module type
  SdkModule,
  ServiceOf } from '@lombard.finance/sdk-common';

// Service interface types (from sdk-common, aliased for clarity)
export type {
  ApiService as IApiService,
  BtcService as IBtcService,
  EvmService as IEvmService } from '@lombard.finance/sdk-common';
