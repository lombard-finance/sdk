// API functions:
export * from './api-functions';

// READ and WRITE functions:
export * from './contract-functions';

// Vault:
export { Vault } from './vaults';
export {
  deposit,
  type DepositParameters,
} from './vaults/lib/deposit';

export {
  queueWithdraw,
  type QueueWithdrawParameters,
  cancelWithdraw,
  type CancelWithdrawParameters,
} from './vaults/lib/withdraw';

export {
  getVaultDeposits,
  type GetVaultDepositsParameters,
} from './vaults/lib/get-vault-deposits';

export {
  getVaultWithdrawals,
  type GetVaultWithdrawalsParameters,
} from './vaults/lib/get-vault-withdrawals';

export {
  getVaultPoints,
  type GetVaultPointsParameters,
} from './vaults/lib/get-vault-points';

// Utils:
export * from './common/api-config';
export * from './common/blockchain-identifier';
export * from './common/chains';
export * from './utils/satoshi';
export * from './tokens/lbtc-addresses';

// Re-exports:
export type { Address, EIP1193Provider } from 'viem';
export { Env } from '@lombard.finance/sdk-common';
