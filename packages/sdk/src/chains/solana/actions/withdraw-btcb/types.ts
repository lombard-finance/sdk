/**
 * Solana Redeem Action Types
 *
 * Redeems BTC.b → BTC on Solana via Asset Router redeemForBtc.
 *
 * @module chains/solana/actions/withdraw-btcb/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { NonEvmOperationStatus } from '../../../../shared/constants/statusConstants';

export interface SolanaWithdrawBtcbParams {
  /** Input asset (BTC.b). A literal, so `withdraw()` can dispatch on it. */
  assetIn: typeof AssetId.BTCb;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

export interface SolanaWithdrawBtcbProgress extends StrategyProgress<NonEvmOperationStatus> {
  status: NonEvmOperationStatus;
  steps: {
    burning: StepStatus;
    releasing: StepStatus;
  };
  txHash?: string;
}

export interface SolanaWithdrawBtcbPrepareParams {
  amount: string;
  /** Bitcoin address to receive BTC */
  recipient: string;
}

export interface ISolanaWithdrawBtcb extends MonitorableAction {
  readonly status: NonEvmOperationStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly txHash?: string;

  prepare(params: SolanaWithdrawBtcbPrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
