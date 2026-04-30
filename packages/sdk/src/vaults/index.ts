// Config:

export {
  BTCE_VAULT_CHAINS,
  BTCE_VAULT_CONTRACTS,
  type BtceVaultChain,
  isBtceVaultChain,
  Vault,
  VEDA_VAULT_STAKE_AND_BAKE_CHAINS,
} from './lib/config';

// Ops - Deposit:
// Note: `deposit` (the underlying-vault deposit) was removed in 5.0.0.
// Use `depositEarn` from the contracts entry instead.

export {
  getVaultDeposits,
  getVaultDepositsAllChains,
  type GetVaultDepositsAllChainsParameters,
  type GetVaultDepositsParameters,
  type VaultDeposit,
} from './lib/ops/get-vault-deposits';
export {
  getVaultMinimumDeposit,
  type GetVaultMinimumDepositParameters,
} from './lib/ops/get-vault-minimum-deposit';
export {
  previewVaultDeposit,
  type PreviewVaultDepositParameters,
} from './lib/ops/preview-vault-deposit';

// Ops - Withdraw:
// Note: `queueWithdraw` and `cancelWithdraw` were removed in 5.0.0.
// Use `withdrawEarn` and `cancelEarnWithdrawal` from the contracts entry.

export {
  getVaultWithdrawals,
  getVaultWithdrawalsAllChains,
  type GetVaultWithdrawalsAllChainsParameters,
  type GetVaultWithdrawalsParameters,
  type VaultWithdrawal,
  type VaultWithdrawals,
} from './lib/ops/get-vault-withdrawals';

// Metrics - Vault points:

export {
  getVaultApy,
  type GetVaultApyParameters,
} from './lib/metrics/get-vault-apy';
export {
  getVaultPoints,
  type GetVaultPointsParameters,
} from './lib/metrics/get-vault-points';
export {
  getVaultTVL,
  type GetVaultTVLParameters,
} from './lib/metrics/get-vault-tvl';
