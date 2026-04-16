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

export { deposit, type DepositParameters } from './lib/ops/deposit';
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

export {
  getVaultWithdrawals,
  getVaultWithdrawalsAllChains,
  type GetVaultWithdrawalsAllChainsParameters,
  type GetVaultWithdrawalsParameters,
  type VaultWithdrawal,
  type VaultWithdrawals,
} from './lib/ops/get-vault-withdrawals';
export {
  cancelWithdraw,
  type CancelWithdrawParameters,
  queueWithdraw,
  type QueueWithdrawParameters,
} from './lib/ops/withdraw';

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
