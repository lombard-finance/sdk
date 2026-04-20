import type { AssetId, Chain, DeployProtocol } from '@lombard.finance/sdk';

// ─── Staking ─────────────────────────────────────────────────────────────────

export type StakingPhase =
  | 'idle'
  | 'preparing'
  | 'waiting-deposit'
  | 'confirming'
  | 'minting'
  | 'complete'
  | 'error';

export interface StakingStatus {
  phase: StakingPhase;
  message: string;
}

export interface StakingProgressInfo {
  confirmations?: number;
  requiredConfirmations?: number;
}

export interface BtcStakeParams {
  amount: string;
  destChain: Chain;
  sourceChain: Chain;
  assetOut: AssetId;
  recipient: string;
}

// ─── Stake-and-Bake ───────────────────────────────────────────────────────────

export type StakeAndBakePhase =
  | 'idle'
  | 'preparing'
  | 'authorizing'
  | 'waiting-deposit'
  | 'confirming'
  | 'depositing'
  | 'complete'
  | 'error';

export interface StakeAndBakeStatus {
  phase: StakeAndBakePhase;
  message: string;
}

export interface StakeAndBakeProgressInfo {
  confirmations?: number;
  requiredConfirmations?: number;
  isDeposited?: boolean;
  isClaimed?: boolean;
}

export interface BtcStakeAndBakeParams {
  amount: string;
  destChain: Chain;
  sourceChain: Chain;
  protocol: DeployProtocol;
  recipient: string;
  referralCode?: string;
}

// ─── Unstaking ───────────────────────────────────────────────────────────────

export type UnstakingPhase =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'authorizing'
  | 'executing'
  | 'confirming'
  | 'complete'
  | 'error';

export interface UnstakingStatus {
  phase: UnstakingPhase;
  message: string;
}

export interface EvmUnstakeParams {
  amount: string;
  sourceChain: Chain;
  destChain: Chain;
  recipient: string;
  assetOut: AssetId;
}

export interface NonEvmUnstakeParams {
  amount: string;
  sourceChain: Chain;
  destChain: Chain;
  recipient: string;
}
