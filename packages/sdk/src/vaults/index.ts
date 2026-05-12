// Config:

export {
  BTCE_VAULT_CHAINS,
  BTCE_VAULT_CONTRACTS,
  type BtceVaultChain,
  EARN_STAKE_AND_BAKE_CHAINS,
  isBtceVaultChain,
} from './lib/config';

// Ops - Deposit:
// Note: `deposit` (the underlying-vault deposit) was removed in 5.0.0.
// Use `depositEarn` from the contracts entry instead.

export {
  type EarnDeposit,
  getEarnDeposits,
  getEarnDepositsAllChains,
  type GetEarnDepositsAllChainsParameters,
  type GetEarnDepositsParameters,
} from './lib/ops/get-vault-deposits';
export {
  getEarnMinimumDeposit,
  type GetEarnMinimumDepositParameters,
} from './lib/ops/get-vault-minimum-deposit';
export {
  previewEarnDeposit,
  type PreviewEarnDepositParameters,
} from './lib/ops/preview-vault-deposit';

// Ops - Withdraw:
// Note: `queueWithdraw` and `cancelWithdraw` were removed in 5.0.0.
// Use `withdrawEarn` and `cancelEarnWithdrawal` from the contracts entry.

export {
  type EarnWithdrawal,
  type EarnWithdrawals,
  getEarnWithdrawals,
  getEarnWithdrawalsAllChains,
  type GetEarnWithdrawalsAllChainsParameters,
  type GetEarnWithdrawalsParameters,
} from './lib/ops/get-vault-withdrawals';

// Metrics - Vault points:

export {
  getEarnApy,
  type GetEarnApyParameters,
} from './lib/metrics/get-vault-apy';
export {
  getEarnPoints,
  type GetEarnPointsParameters,
} from './lib/metrics/get-vault-points';
export {
  getEarnTVL,
  type GetEarnTVLParameters,
} from './lib/metrics/get-vault-tvl';
