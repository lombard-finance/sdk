/**
 * BTC StakeAndDeploy Action Exports
 *
 * @module chains/btc/actions/deploy-lbtc
 */

// Main action class
export { BtcDeployLbtc } from './BtcDeployLbtc';

// Factory functions
export { btcStakeAndDeploy, createBtcStakeAndDeploy } from './factory';

// Types
export type {
  BtcDeployLbtcParams,
  BtcDeployLbtcPrepareParams,
  BtcDeployLbtcProgress,
  BtcDeployLbtc as IBtcDeployLbtc,
} from './types';
export { BtcActionStatus } from './types';

// Configuration types (for advanced usage)
export type {
  StakeAndDeployChainConfig,
  StakeAndDeployRouteDefinition,
} from './config';
