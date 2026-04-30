/**
 * Solana Stake Action Types
 *
 * Stakes BTC.b on Solana → LBTC on Solana via Asset Router + GMP.
 *
 * @module chains/solana/actions/stake/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress } from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { NonEvmOperationStatus } from '../../../../shared/constants/statusConstants';

export interface SolanaStakeParams {
  assetIn: AssetId;
  assetOut: AssetId;
  chain: Chain;
}

export interface SolanaStakeProgress
  extends StrategyProgress<NonEvmOperationStatus> {
  status: NonEvmOperationStatus;
  steps: {
    burning: StepStatus;
    minting: StepStatus;
  };
  txHash?: string;
}

export interface SolanaStakePrepareParams {
  amount: string;
  /** Solana address to receive LBTC */
  recipient: string;
}

export interface ISolanaStake extends MonitorableAction {
  readonly status: NonEvmOperationStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly txHash?: string;

  prepare(params: SolanaStakePrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
