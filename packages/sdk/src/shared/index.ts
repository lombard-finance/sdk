/**
 * Shared utilities for the Lombard SDK
 *
 * This module exports events, errors, monitoring utilities, and validation schemas.
 * For types like Chain, AssetId, etc., import from '@lombard.finance/sdk/core'.
 */

// Events
export * from "./events";

// Errors
export * from "./errors";

// Deposit utilities
export {
  calcConfirmations,
  type ConfirmationProgress,
  depositRequiresAction,
  type DepositStatus,
  type DepositStatusDisplay,
  getConfirmationProgress,
  getDepositStatus,
  getDepositStatusDisplay,
  isDepositClaimable,
  isDepositPending,
  isDepositTerminal,
  MIN_CLAIM_AMOUNT_BTC,
  REQUIRED_CONFIRMATIONS,
  type StatusSeverity,
} from "./deposits";

// Monitoring utilities
export {
  createPollingMonitor,
  type DepositInfo,
  monitorDeposit,
  type MonitorOptions,
  type MonitorProgress,
} from "./monitoring";

// Validation schemas (selective exports for public API)
export {
  addressSchemasByChainType,
  bitcoinAddressSchema,
  // Schemas
  btcAmountSchema,
  evmAddressSchema,
  solanaAddressSchema,
  starknetAddressSchema,
  suiAddressSchema,
  // Helpers
  validate,
  validateOrThrow,
} from "./validation";
