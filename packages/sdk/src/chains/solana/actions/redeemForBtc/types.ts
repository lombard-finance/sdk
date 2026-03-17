/**
 * Solana RedeemForBtc Action Types
 *
 * Redeems BTC.b or LBTC on Solana → BTC on Bitcoin via Asset Router + GMP.
 *
 * @module chains/solana/actions/redeemForBtc/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { NonEvmUnstakeStatus } from '../../../../shared/constants/statusConstants';

export interface SolanaRedeemForBtcParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

export interface SolanaRedeemForBtcProgress
  extends StrategyProgress<NonEvmUnstakeStatus> {
  status: NonEvmUnstakeStatus;
  steps: {
    burning: StepStatus;
    releasing: StepStatus;
  };
  txHash?: string;
}

export interface SolanaRedeemForBtcPrepareParams {
  amount: string;
  /** Bitcoin address to receive BTC */
  recipient: string;
}

export interface ISolanaRedeemForBtc extends MonitorableAction {
  readonly status: NonEvmUnstakeStatus;
  readonly amount?: string;
  readonly recipient?: string;
  readonly txHash?: string;

  prepare(params: SolanaRedeemForBtcPrepareParams): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
