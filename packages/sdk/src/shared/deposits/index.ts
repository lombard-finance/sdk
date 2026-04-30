/**
 * Deposit Utilities
 *
 * Centralized utilities for working with deposits, including status
 * determination, confirmation tracking, and display helpers.
 *
 * @module shared/deposits
 */

export {
  // Core functions
  calcConfirmations,
  // Types
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
  // Constants
  MIN_CLAIM_AMOUNT_BTC,
  REQUIRED_CONFIRMATIONS,
  type StatusSeverity } from './depositStatus';

