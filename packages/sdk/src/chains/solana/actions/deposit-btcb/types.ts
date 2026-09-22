/**
 * Solana Stake Action Types
 *
 * Stakes BTC.b on Solana → LBTC on Solana via Asset Router + GMP.
 *
 * @module chains/solana/actions/deposit-btcb/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { NonEvmOperationStatus } from '../../../../shared/constants/statusConstants';

export interface SolanaDepositBtcbParams {
  assetIn: AssetId;
  assetOut: AssetId;
  chain: Chain;
}

export interface SolanaDepositBtcbProgress extends StrategyProgress<NonEvmOperationStatus> {
  status: NonEvmOperationStatus;
  steps: {
    burning: StepStatus;
    minting: StepStatus;
  };
  txHash?: string;
}

export interface SolanaDepositBtcbPrepareParams {
  amount: string;
  /** Solana address to receive LBTC */
  recipient: string;
}

export interface ISolanaDepositBtcb extends MonitorableAction {
  readonly status: NonEvmOperationStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly txHash?: string;

  prepare(params: SolanaDepositBtcbPrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
