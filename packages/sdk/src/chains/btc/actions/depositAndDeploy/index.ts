/**
 * BTC DepositAndDeploy Action
 *
 * Exports for BTC → BTC.b → Vault operations.
 *
 * @module chains/btc/actions/depositAndDeploy
 */

export { BtcDepositAndDeploy } from './BtcDepositAndDeploy';
export {
  depositAndDeployConfig,
  isAssetOutSupported as isDepositAndDeployAssetOutSupported,
  isDestChainSupported as isDepositAndDeployDestChainSupported,
  isProtocolSupported as isDepositAndDeployProtocolSupported,
  isRouteAvailable as isDepositAndDeployRouteAvailable,
} from './config';
export { createBtcDepositAndDeploy } from './factory';
export {
  BtcActionStatus,
  type BtcDepositAndDeployParams,
  type BtcDepositAndDeployPrepareParams,
  type BtcDepositAndDeployProgress,
  type BtcDepositAndDeploy as IBtcDepositAndDeploy,
} from './types';
