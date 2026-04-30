/**
 * BTC Deposit Action Exports
 *
 * @module chains/btc/actions/deposit
 */

// Main action class
export { BtcDeposit } from './BtcDeposit';

// Factory functions
export { btcDeposit, createBtcDeposit } from './factory';

// Types
export type {
  BtcDepositParams,
  BtcDepositPrepareParams,
  BtcDepositProgress,
  BtcDeposit as IBtcDeposit } from './types';
export { BtcActionStatus } from './types';

// Configuration types (for advanced usage)
export type { DepositChainConfig, DepositRouteDefinition } from './config';
