/**
 * Vault functions - Vault deposits, withdrawals, and queries
 *
 * Import from '@lombard.finance/sdk/vaults' for vault-only functionality.
 */

// `cancelWithdraw`, `deposit`, `queueWithdraw` and their parameter types
// were removed in 5.0.0. Use `cancelEarnWithdrawal`, `depositEarn`, and
// `withdrawEarn` from the `@lombard.finance/sdk/contracts` entry instead.
export {
  getVaultApy,
  type GetVaultApyParameters,
  getVaultDeposits,
  getVaultDepositsAllChains,
  type GetVaultDepositsAllChainsParameters,
  type GetVaultDepositsParameters,
  getVaultMinimumDeposit,
  type GetVaultMinimumDepositParameters,
  getVaultPoints,
  type GetVaultPointsParameters,
  getVaultTVL,
  type GetVaultTVLParameters,
  getVaultWithdrawals,
  getVaultWithdrawalsAllChains,
  type GetVaultWithdrawalsAllChainsParameters,
  type GetVaultWithdrawalsParameters,
  previewVaultDeposit,
  type PreviewVaultDepositParameters,
  Vault,
  type VaultDeposit,
  type VaultWithdrawal,
  type VaultWithdrawals,
} from '../vaults';
