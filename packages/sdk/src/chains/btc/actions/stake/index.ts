/**
 * BTC Stake Action Exports
 *
 * @module chains/btc/actions/stake
 */

// Main action class
export { BtcStake } from './BtcStake';

// Factory functions
export { btcStake, createBtcStake } from './factory';

// Types
export type {
  BtcStakeParams,
  BtcStakeProgress,
  BtcStake as IBtcStake,
} from './types';
export { BtcActionStatus } from './types';

// Configuration types (for advanced usage / extending)
export type { ChainConfig, RouteDefinition, SignatureResult } from './config';
