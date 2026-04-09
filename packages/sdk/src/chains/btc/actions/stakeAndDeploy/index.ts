/**
 * BTC StakeAndDeploy Action Exports
 *
 * @module chains/btc/actions/stakeAndDeploy
 */

// Main action class
export { BtcStakeAndDeploy } from "./BtcStakeAndDeploy";

// Factory functions
export { btcStakeAndDeploy, createBtcStakeAndDeploy } from "./factory";

// Types
export type {
  BtcStakeAndDeployParams,
  BtcStakeAndDeployPrepareParams,
  BtcStakeAndDeployProgress,
  BtcStakeAndDeploy as IBtcStakeAndDeploy,
} from "./types";
export { BtcActionStatus } from "./types";

// Configuration types (for advanced usage)
export type {
  StakeAndDeployChainConfig,
  StakeAndDeployRouteDefinition,
} from "./config";
