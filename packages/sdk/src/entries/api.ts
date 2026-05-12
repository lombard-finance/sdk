/**
 * API functions - Backend API interactions
 *
 * Import from '@lombard.finance/sdk/api' for API-only functionality
 * without pulling in contract/chain code.
 */

// API response types
export type { Deposit } from '../api-functions/getDepositsByAddress/getDepositsByAddress';
export type { Unstake } from '../api-functions/getUnstakesByAddress/getUnstakesByAddress';
export { PayoutTxStatus } from '../api-functions/getUnstakesByAddress/getUnstakesByAddress';

// API functions
export {
  generateDepositBtcAddress,
  type IGenerateDepositBtcAddressParams,
  SANCTIONED_ADDRESS,
} from '../api-functions/generateDepositBtcAddress/generateDepositBtcAddress';
export {
  getDepositBtcAddress,
  getDepositBtcAddresses,
} from '../api-functions/getDepositBtcAddress/getDepositBtcAddress';
export type {
  IApiError,
  IDepositAddress,
  IDepositAddressesResponse,
  IGetDepositBtcAddressesParameters,
  IGetDepositBtcAddressParameters,
} from '../api-functions/getDepositBtcAddress/types';
export {
  type DirectDeposit,
  type DirectDepositsResponse,
  ENotarizationStatus,
  ESessionState,
  fetchBTCbDeposits,
  fetchDirectDeposits,
  getDepositsByAddress,
  type IGetDepositsByAddressParams,
  type NativeDeposit,
  type NativeDepositsResponse,
} from '../api-functions/getDepositsByAddress/getDepositsByAddress';
export { getExchangeRatio } from '../api-functions/getLBTCExchangeRate/get-exchange-ratio';
export {
  getLBTCExchangeRate,
  type IgetLBTCExchangeRateParams,
  type IgetLBTCExchangeRateResponse,
} from '../api-functions/getLBTCExchangeRate/getLBTCExchangeRate';
export {
  getNetworkFeeSignature,
  type IGetNetworkFeeSignatureMappedResponse,
  type IGetNetworkFeeSignatureParams,
} from '../api-functions/getNetworkFeeSignature/getNetworkFeeSignature';
export {
  getLuxSeason1Points,
  getLuxSeason2Points,
  getPointsByAddress,
  type IGetPointsByAddressParameters,
  type IPointsBase,
  type IPointsByAddressSeason1,
  type IPointsByAddressSeason2,
  type IProtocolPointsBreakdown,
} from '../api-functions/getPointsByAddress/getPointsByAddress';
export {
  fetchUnstakesByAddress,
  getUnstakesByAddress,
  type IGetUnstakesByAddressParameters,
} from '../api-functions/getUnstakesByAddress/getUnstakesByAddress';
export {
  getUserStakeAndBakeSignature,
  type IGetUserStakeAndBakeSignatureParams,
  type IGetUserStakeAndBakeSignatureResponse,
} from '../api-functions/getUserStakeAndBakeSignature/getUserStakeAndBakeSignature';
export {
  type ISetReferralParams,
  setReferral,
} from '../api-functions/setReferral/setReferral';
export {
  type IStoreNetworkFeeSignatureParams,
  type IStoreNetworkFeeSignatureStatus,
  storeNetworkFeeSignature,
} from '../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
export {
  type IStoreStakeAndBakeSignatureParams,
  type IStoreStakeAndBakeSignatureStatus,
  storeStakeAndBakeSignature,
} from '../api-functions/storeStakeAndBakeSignature/storeStakeAndBakeSignature';

// Referrals
export { ReferralsClient } from '../referrals';
export type {
  ReferralLookupParams,
  ReferralLookupResult,
} from '../referrals/ReferralsClient';

// Deposit status utilities
export {
  calcConfirmations,
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
  MIN_CLAIM_AMOUNT_BTC,
  REQUIRED_CONFIRMATIONS,
  type StatusSeverity,
} from '../shared/deposits';
