/**
 * BTC Stake Action Exports
 *
 * @module chains/btc/actions/deposit-lbtc
 */

// Main action class
export { BtcDepositLbtc } from './BtcDepositLbtc';

// Factory functions
export { btcStake, createBtcStake } from './factory';

// Types
export type {
  BtcDepositLbtcParams,
  BtcDepositLbtcProgress,
  BtcDepositLbtc as IBtcDepositLbtc,
} from './types';
export { BtcActionStatus } from './types';

// Configuration types (for advanced usage / extending)
export type { ChainConfig, RouteDefinition, SignatureResult } from './config';
