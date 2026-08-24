/**
 * Solana Redeem Action Types
 *
 * Redeems BTC.b → BTC on Solana via Asset Router redeemForBtc.
 *
 * @module chains/solana/actions/redeem/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { NonEvmOperationStatus } from '../../../../shared/constants/statusConstants';

export interface SolanaRedeemParams {
  /** Input asset (BTC.b). A literal, so `withdraw()` can dispatch on it. */
  assetIn: typeof AssetId.BTCb;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

export interface SolanaRedeemProgress extends StrategyProgress<NonEvmOperationStatus> {
  status: NonEvmOperationStatus;
  steps: {
    burning: StepStatus;
    releasing: StepStatus;
  };
  txHash?: string;
}

export interface SolanaRedeemPrepareParams {
  amount: string;
  /** Bitcoin address to receive BTC */
  recipient: string;
}

export interface ISolanaRedeem extends MonitorableAction {
  readonly status: NonEvmOperationStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly txHash?: string;

  prepare(params: SolanaRedeemPrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
