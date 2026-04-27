/**
 * Contract functions - Smart contract interactions
 *
 * Import from '@lombard.finance/sdk/contracts' for contract-only functionality.
 */

// Contract functions - READ
export {
  BasculeDepositStatus,
  getBasculeDepositStatus,
  type IGetBasculeDepositStatusParameters,
} from '../contract-functions/getBasculeDepositStatus/getBasculeDepositStatus';
export {
  getLBTCBurningFee,
  getLBTCMintingFee,
  getMinRedeemAmount,
  getMinRedeemAmountWithFee,
  getMintingFee,
  getRedeemFee,
} from '../contract-functions/getLBTCMintingFee/getLBTCMintingFee';
export { getLBTCTotalSupply } from '../contract-functions/getLBTCTotalSupply/getLBTCTotalSupply';
export {
  getPermitNonce,
  type IGetPermitNonceParams,
} from '../contract-functions/getPermitNonce/getPermitNonce';
export {
  getStakeAndBakeFee,
  type IGetStakeAndBakeFeeParams,
} from '../contract-functions/getStakeAndBakeFee/getStakeAndBakeFee';

// Contract functions - WRITE
export {
  approveLBTC,
  type IApproveLBTCParams,
} from '../contract-functions/approveLBTC/approveLBTC';
export {
  approveToken,
  getTokenAllowance,
  type IApproveTokenParams,
} from '../contract-functions/approveToken/approveToken';
export {
  claimLBTC,
  type IClaimLBTCParams,
  mintToken,
} from '../contract-functions/claimLBTC/claimLBTC';
export {
  claimUnstakeRedeem,
  type IClaimUnstakeRedeemParams,
} from '../contract-functions/claimUnstakeRedeem/claimUnstakeRedeem';
export {
  depositToken,
  getAssetRouterAddress,
} from '../contract-functions/deposit/depositToken';
export {
  getAddressConfirmationMessage,
  signLbtcDestinationAddr,
  type SignLbtcDestinationAddrParams,
} from '../contract-functions/signLbtcDestionationAddr/signLbtcDestinationAddr';
export {
  type ISignNetworkFeeParams,
  type ISignNetworkFeeResponse,
  signNetworkFee,
} from '../contract-functions/signNetworkFee/signNetworkFee';
export {
  type ISignStakeAndBakeParams,
  type ISignStakeAndBakeResult,
  signStakeAndBake,
} from '../contract-functions/signStakeAndBake/signStakeAndBake';
export { getStakeAndBakeConfig } from '../contract-functions/signStakeAndBake/validation';
export {
  type IUnstakeLBTCParams,
  redeemToken,
  unstakeLBTC,
} from '../contract-functions/unstakeLBTC/unstakeLBTC';

// Contract functions - VAULT READ
export {
  getBtceShares,
  type IGetBtceSharesParameters,
} from '../contract-functions/getBtceShares/getBtceShares';
export {
  getEarnPosition,
  type IGetEarnPositionParameters,
  type IGetEarnPositionResponse,
} from '../contract-functions/getEarnPosition/getEarnPosition';
export {
  getSharesByAddress,
  type IGetSharesByAddressParameters,
} from '../contract-functions/getSharesByAddress/getSharesByAddress';
export {
  getShareValue,
  type IGetShareValueParameters,
} from '../contract-functions/getShareValue/getShareValue';

// Contract functions - VAULT WRITE
export {
  cancelEarnWithdrawal,
  type CancelEarnWithdrawalParameters,
} from '../contract-functions/cancelEarnWithdrawal/cancelEarnWithdrawal';
export {
  depositEarn,
  type DepositEarnParameters,
} from '../contract-functions/depositEarn/depositEarn';
export {
  previewWithdrawEarn,
  type PreviewWithdrawEarnParameters,
  type PreviewWithdrawEarnResult,
} from '../contract-functions/previewWithdrawEarn/previewWithdrawEarn';
export {
  unwrapBtceToLbtcv,
  type UnwrapBtceToLbtcvParameters,
} from '../contract-functions/unwrapBtceToLbtcv/unwrapBtceToLbtcv';
export {
  withdrawEarn,
  type WithdrawEarnParameters,
  type WithdrawEarnResult,
} from '../contract-functions/withdrawEarn/withdrawEarn';
export {
  wrapToBtce,
  type WrapToBtceParameters,
} from '../contract-functions/wrapToBtce/wrapToBtce';
