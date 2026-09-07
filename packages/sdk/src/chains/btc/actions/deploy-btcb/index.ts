/**
 * BTC DepositAndDeploy Action
 *
 * Exports for BTC → BTC.b → Vault operations.
 *
 * @module chains/btc/actions/deploy-btcb
 */

export { BtcDeployBtcb } from './BtcDeployBtcb';
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
  type BtcDeployBtcbParams,
  type BtcDeployBtcbPrepareParams,
  type BtcDeployBtcbProgress,
  type BtcDeployBtcb as IBtcDeployBtcb,
} from './types';
