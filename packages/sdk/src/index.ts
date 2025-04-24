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
  cancelWithdraw,
  queueWithdraw,
  type CancelWithdrawParameters,
  type QueueWithdrawParameters,
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

// Rewards:
export * from './rewards';

// Utils:
export * from './common/api-config';
export * from './common/blockchain-identifier';
export * from './common/chains';
export {
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
} from './common/chains';
export {
  SUI_DEVNET_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
} from './common/chains';
export * from './tokens/lbtc-addresses';
export * from './utils/satoshi';

// Re-exports:
export type { Address, EIP1193Provider } from 'viem';
export { Env } from '@lombard.finance/sdk-common';

// Bridge:
export {
  getBridgeInfo,
  bridge,
  bridgeCCIP,
  bridgeOFT,
  type BridgeParameters,
  type BridgeCCIPParameters,
  type BridgeOFTParameters,
} from './bridge';
