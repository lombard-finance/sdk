/**
 * Shared BTC Action Utilities
 *
 * Common utilities and base classes for BTC actions.
 *
 * @module chains/btc/actions/shared
 */

export type {
  AuthorizeDepositOptions,
  BaseBtcParams,
  BtcAuthorizationState,
  StatusConfig,
  StepDefinition,
} from './BaseBtcAction';
export { BaseBtcAction } from './BaseBtcAction';
export type {
  BtcAuthorizationKind,
  BtcAuthorizeOptions,
  BtcDepositRouteConfig,
  BtcFeeAuthConfig,
  BtcFeeAuthResult,
  BtcRouteDefinition,
  BtcSignatureResult,
  BtcStoredFeeSignature,
} from './routeConfig';
export { toBtcDepositRouteConfig } from './routeConfig';
export { assetIdToToken } from './tokenUtils';
export type {
  ValidatableConfig,
  ValidatableParams,
  ValidationContext,
} from './validation';
export {
  isAssetSupported,
  isDestChainSupported,
  isRouteAvailable,
  validateBtcActionParams,
  validateProtocol,
} from './validation';
