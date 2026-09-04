/**
 * EVM Redeem Action Types
 *
 * Redeems BTC.b to native BTC (cross-chain).
 * This is the opposite operation to BTC Deposit.
 *
 * Flow: BTC.b (EVM) → BTC (Bitcoin)
 *
 * ## Fee Authorization
 *
 * EVM Redeem does not require network-fee authorization on any source chain.
 * There is no auto-mint on the Bitcoin destination, so the model used by BTC
 * Deposit and EVM Withdraw-to-BTC.b on Ethereum/Sepolia does not apply here.
 *
 * **Flow (all source chains):**
 * IDLE → READY → COMPLETED
 *
 * @module chains/evm/actions/withdraw-btcb/types
 */

import type {
  AssetId,
  Chain,
  StepStatus,
  StrategyProgress,
} from '../../../../core';
import type { MonitorableAction } from '../../../../shared/actions/BaseAction';
import type { EvmOperationStatus } from '../../../../shared/constants/statusConstants';
import type { LombardError } from '../../../../shared/errors';
import type { FeeAuthState } from '../../shared/feeAuth';

// Re-export status for convenience
export { EvmOperationStatus as EvmWithdrawBtcbStatus } from '../../../../shared/constants/statusConstants';

/**
 * EVM Redeem parameters
 *
 * Redeems BTC.b to native BTC on Bitcoin network.
 */
export interface EvmWithdrawBtcbParams {
  /** Input asset (BTC.b). A literal, so `withdraw()` can tell it from an
   * withdraw — see {@link EvmWithdrawLbtcParams.assetIn}. */
  assetIn: typeof AssetId.BTCb;
  /** Output asset (BTC) */
  assetOut: AssetId;
  /** Source chain (EVM chain where BTC.b is held) */
  sourceChain: Chain;
  /** Destination chain (Bitcoin network) */
  destChain: Chain;
}

/**
 * EVM Redeem prepare parameters
 */
export interface EvmWithdrawBtcbPrepareParams {
  /** Amount of BTC.b to redeem */
  amount: string;
  /** Bitcoin address to receive BTC */
  recipient: string;
}

/**
 * EVM Redeem progress
 */
export interface EvmWithdrawBtcbProgress extends StrategyProgress<EvmOperationStatus> {
  status: EvmOperationStatus;
  steps: {
    redeeming: StepStatus;
  };
  txHash?: string;
}

/**
 * EVM Redeem interface
 */
export interface IEvmWithdrawBtcb extends MonitorableAction {
  readonly status: EvmOperationStatus;
  readonly error: LombardError | null;
  readonly amount?: string;
  readonly recipient?: string;
  readonly needsApproval: boolean;
  readonly txHash?: string;

  /** Fee authorization state (for UI display) */
  readonly feeAuth: FeeAuthState;

  prepare(params: EvmWithdrawBtcbPrepareParams): Promise<void>;
  /**
   * @deprecated EVM Redeem no longer requires fee authorization. The status
   * machine never reaches `NEEDS_FEE_AUTHORIZATION`; this method is kept for
   * backwards compatibility and is a safe no-op that resolves immediately
   * regardless of the current status.
   */
  authorizeFee(): Promise<void>;
  approve(): Promise<void>;
  execute(): Promise<{ txHash: string }>;
}
