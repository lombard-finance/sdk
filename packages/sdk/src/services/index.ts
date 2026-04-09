/**
 * Service Classes
 *
 * Concrete implementations of service interfaces defined in sdk-common.
 * These are instantiated by modules and injected into action contexts.
 *
 * Naming convention:
 * - sdk-common: `interface ApiService` (contract)
 * - sdk: `class ApiService implements IApiService` (implementation)
 *
 * Type separation:
 * - Services return minimal types (for internal use by actions)
 * - Public APIs return rich types (for external use)
 *
 * @module services
 */

export { ApiService } from "./ApiService";
export { BtcService } from "./BtcService";
export { EvmService } from "./EvmService";

// Re-export service interfaces from sdk-common for convenience
// Use these for typing, use the classes above for instantiation
export type {
  BtcNetworkMode,
  DepositInfo,
  DestinationChainId,
  EvmChainId,
  FeeAuthorizationResult,
  FeeSignatureResult,
  GenerateDepositAddressParams,
  GetDepositAddressParams,
  GetFeeSignatureParams,
  ApiService as IApiService,
  BtcService as IBtcService,
  EvmService as IEvmService,
  SignNetworkFeeParams,
  SignNetworkFeeResult,
  SignStakeAndBakeParams,
  StoredFeeSignature,
  StoreFeeSignatureParams,
  StoreStakeAndBakeParams,
} from "@lombard.finance/sdk-common";
