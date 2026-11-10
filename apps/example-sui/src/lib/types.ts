import type { AssetId, Chain } from '@lombard.finance/sdk';

/**
 * Form data for staking configuration
 */
export interface DepositFormData {
  amount: string;
  destChain: Chain;
  destAddress: string;
  assetOut: AssetId;
}

/**
 * Staking status from SDK
 */
export interface DepositStatus {
  phase:
    | 'idle'
    | 'preparing'
    | 'waiting-deposit'
    | 'confirming'
    | 'minting'
    | 'complete'
    | 'error';
  message: string;
}

/**
 * Progress information from SDK events
 */
export interface DepositProgressInfo {
  confirmations?: number;
  requiredConfirmations?: number;
}

/**
 * Form data for unstaking configuration
 */
export interface WithdrawFormData {
  amount: string;
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
  recipient: string;
}

/**
 * Unstaking status
 */
export interface WithdrawStatus {
  phase:
    | 'idle'
    | 'preparing'
    | 'ready'
    | 'authorizing'
    | 'executing'
    | 'confirming'
    | 'complete'
    | 'error';
  message: string;
}
