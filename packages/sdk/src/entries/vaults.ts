/**
 * Vault functions - Vault deposits, withdrawals, and queries
 *
 * Import from '@lombard.finance/sdk/vaults' for vault-only functionality.
 */

// `cancelWithdraw`, `deposit`, `queueWithdraw` and their parameter types
// were removed in 5.0.0. Use `cancelEarnWithdrawal`, `depositEarn`, and
// `withdrawEarn` from the `@lombard.finance/sdk/contracts` entry instead.
export {
  type EarnDeposit,
  type EarnWithdrawal,
  type EarnWithdrawals,  getEarnApy,
  type GetEarnApyParameters,
  getEarnDeposits,
  getEarnDepositsAllChains,
  type GetEarnDepositsAllChainsParameters,
  type GetEarnDepositsParameters,
  getEarnMinimumDeposit,
  type GetEarnMinimumDepositParameters,
  getEarnPoints,
  type GetEarnPointsParameters,
  getEarnTVL,
  type GetEarnTVLParameters,
  getEarnWithdrawals,
  getEarnWithdrawalsAllChains,
  type GetEarnWithdrawalsAllChainsParameters,
  type GetEarnWithdrawalsParameters,
  previewEarnDeposit,
  type PreviewEarnDepositParameters } from '../vaults';
