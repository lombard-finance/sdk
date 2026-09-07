import type { AssetId, Chain, DeployProtocol } from '@lombard.finance/sdk';

// ─── Deposit ─────────────────────────────────────────────────────────────────

export type DepositPhase =
  | 'idle'
  | 'preparing'
  | 'waiting-deposit'
  | 'confirming'
  | 'minting'
  | 'complete'
  | 'error';

export interface DepositStatus {
  phase: DepositPhase;
  message: string;
}

export interface DepositProgressInfo {
  confirmations?: number;
  requiredConfirmations?: number;
}

export interface BtcDepositBtcbParams {
  amount: string;
  destChain: Chain;
  sourceChain: Chain;
  /** LBTC or BTC.b. `btc.deposit()` dispatches on it. */
  assetOut: AssetId;
  recipient: string;
}

// ─── Deploy ──────────────────────────────────────────────────────────────────

export type DeployPhase =
  | 'idle'
  | 'preparing'
  | 'authorizing'
  | 'waiting-deposit'
  | 'confirming'
  | 'depositing'
  | 'complete'
  | 'error';

export interface DeployStatus {
  phase: DeployPhase;
  message: string;
}

export interface DeployProgressInfo {
  confirmations?: number;
  requiredConfirmations?: number;
  isDeposited?: boolean;
  isClaimed?: boolean;
}

export interface BtcDeployParams {
  amount: string;
  destChain: Chain;
  sourceChain: Chain;
  protocol: DeployProtocol;
  recipient: string;
  referralCode?: string;
  /**
   * Signature expiration as an absolute UNIX timestamp in seconds. Omitted, the
   * SDK's own default applies, so the value is not repeated here.
   */
  expiry?: number;
}

// ─── Withdraw ────────────────────────────────────────────────────────────────

export type WithdrawPhase =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'authorizing'
  | 'executing'
  | 'confirming'
  | 'complete'
  | 'error';

export interface WithdrawStatus {
  phase: WithdrawPhase;
  message: string;
}

export interface EvmWithdrawVaultParams {
  amount: string;
  sourceChain: Chain;
  destChain: Chain;
  recipient: string;
  assetOut: AssetId;
}

export interface NonEvmWithdrawParams {
  amount: string;
  sourceChain: Chain;
  destChain: Chain;
  recipient: string;
}
