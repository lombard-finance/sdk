/**
 * BTC Deposit Action Exports
 *
 * @module chains/btc/actions/deposit-btcb
 */

// Main action class
export { BtcDepositBtcb } from './BtcDepositBtcb';

// Factory functions
export { btcDeposit, createBtcDeposit } from './factory';

// Types
export type {
  BtcDepositBtcbParams,
  BtcDepositBtcbPrepareParams,
  BtcDepositBtcbProgress,
  BtcDepositBtcb as IBtcDepositBtcb,
} from './types';
export { BtcActionStatus } from './types';

// Configuration types (for advanced usage)
export type { DepositChainConfig, DepositRouteDefinition } from './config';
