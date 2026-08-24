/**
 * EVM Actions
 *
 * Provides factory methods for EVM chain operations.
 *
 * Operations:
 * - stake: BTC.b → LBTC (stake wrapped BTC to get LBTC)
 * - unstake: LBTC → BTC (cross-chain) or LBTC → BTC.b (same-chain)
 * - deposit: BTCb → LBTC (deposit BTC.b to receive LBTC)
 * - deploy: LBTC/BTC.b → DeFi protocols (Veda, Silo)
 * - withdraw: Queue withdrawal from DeFi protocols
 * - cancelWithdraw: Cancel pending withdrawal from DeFi protocols
 * - redeem: BTC.b → BTC (cross-chain redemption to Bitcoin)
 *
 * @example
 * ```typescript
 * import { createLombardSDK, Chain, Env } from '@lombard.finance/sdk';
 *
 * const sdk = await createLombardSDK({
 *   env: Env.prod,
 *   providers: { evm: () => window.ethereum },
 * });
 *
 * const unstake = sdk.chain.evm.unstake({
 *   sourceChain: Chain.ETHEREUM,
 *   assetOut: AssetId.BTC,
 * });
 *
 * await unstake.prepare({ amount: '0.1', recipient: 'bc1q...' });
 * const { txHash } = await unstake.execute();
 * ```
 *
 * @module chains/evm/EvmActions
 */

import type { LombardConfig } from '../../config/types';
import type { Chain } from '../../core';
import { AssetId } from '../../core';
import type { EvmCoreContext } from '../../shared/context';
import { createEvmCoreContext } from '../../shared/context';
import { LombardError, ValidationErrorCode } from '../../shared/errors';
import {
  createEvmDeploy,
  type EvmDeployParams,
  type IEvmDeploy,
} from './actions/deploy';
import {
  createEvmDeposit,
  type EvmDepositParams,
  type IEvmDeposit,
} from './actions/deposit';
import {
  createEvmRedeem,
  type EvmRedeemParams,
  type IEvmRedeem,
} from './actions/redeem';
// Import action factories
import {
  createEvmStake,
  type EvmStakeParams,
  type IEvmStake,
} from './actions/stake';
import {
  createEvmUnstake,
  type EvmUnstakeParams,
  type IEvmUnstake,
} from './actions/unstake';
import {
  createEvmCancelWithdraw,
  createEvmWithdraw,
  type EvmCancelWithdrawParams,
  type EvmWithdrawParams,
  type IEvmCancelWithdraw,
  type IEvmWithdraw,
} from './actions/withdraw';

/**
 * EVM Actions
 *
 * User-facing class for EVM operations.
 * Created via evmActions(config) factory function.
 */
/**
 * An asset withdrawal whose input asset is only known at runtime.
 *
 * `EvmUnstakeParams` and `EvmRedeemParams` are structurally identical apart from
 * the `assetIn` literal that distinguishes them, so this is their shape with
 * that discriminant widened. It exists for the overload above: without it, a
 * caller passing a plain `AssetId` matches no signature at all.
 */
export interface EvmAssetWithdrawParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

export class EvmActions {
  private readonly ctx: EvmCoreContext;

  constructor(config: LombardConfig) {
    this.ctx = createEvmCoreContext(config);
  }

  /**
   * Stake BTC.b to receive LBTC
   *
   * Converts wrapped BTC (BTC.b) to LBTC via the Asset Router.
   * Currently supported on Avalanche.
   *
   * @example
   * ```typescript
   * const stake = evm.stake({
   *   assetIn: AssetId.BTCb,
   *   assetOut: AssetId.LBTC,
   *   sourceChain: Chain.AVALANCHE,
   *   destChain: Chain.AVALANCHE,
   * });
   * ```
   */
  deposit(params: EvmStakeParams): IEvmStake {
    return createEvmStake(this.ctx, params);
  }

  /**
   * Deposit BTCb to get LBTC
   *
   * Deposits BTC.b to receive LBTC via the claim flow.
   *
   * @example
   * ```typescript
   * const deposit = evm.deposit({
   *   assetIn: AssetId.BTCb,
   *   assetOut: AssetId.LBTC,
   *   sourceChain: Chain.ETHEREUM,
   *   destChain: Chain.ETHEREUM,
   * });
   * ```
   */
  /**
   * Claim an already-notarized mint.
   *
   * The new name for what `deposit()` has always done.
   */
  claim(params: EvmDepositParams): IEvmDeposit {
    return createEvmDeposit(this.ctx, params);
  }

  /**
   * Deploy L-Assets to DeFi protocols
   *
   * Currently supports Veda and Silo protocols.
   *
   * @example
   * ```typescript
   * const deploy = evm.deploy({
   *   asset: AssetId.LBTC,
   *   sourceChain: Chain.ETHEREUM,
   *   protocol: DeployProtocol.Veda,
   *   recipient: '0x...',
   * });
   * ```
   */
  deploy(params: EvmDeployParams): IEvmDeploy {
    return createEvmDeploy(this.ctx, params);
  }

  /**
   * Withdraw vault shares from DeFi protocols
   *
   * Queues a withdrawal request from DeFi protocols (e.g., Veda vault).
   * After the withdrawal is queued, it will be processed within the
   * protocol's withdrawal window.
   *
   * @example
   * ```typescript
   * const withdraw = evm.withdraw({
   *   protocol: DeployProtocol.Veda,
   *   sourceChain: Chain.ETHEREUM,
   *   recipient: '0x...',
   * });
   * await withdraw.prepare({ amount: '0.1' });
   * if (withdraw.needsApproval) await withdraw.approve();
   * await withdraw.execute();
   * ```
   */
  /**
   * Withdraw value out: to an asset, or out of a vault.
   *
   * Overloaded rather than unioned so the caller gets the precisely-typed
   * action. That matters because the two arms have different terminals —
   * `EvmWithdrawStatus` has `completed` and no `queued`, `EvmVaultWithdrawStatus`
   * has `queued` and no `completed` — so comparing against the wrong one is a
   * compile error rather than a UI reporting an unsettled request as done.
   *
   * The vault arm is what this method already did in 5.x, unchanged, so no
   * existing call moves. The asset arms are new here and dispatch on `assetIn`:
   *
   * - `assetIn: LBTC` burns LBTC for BTC cross-chain or BTC.b same-chain
   * - `assetIn: BTC.b` redeems BTC.b for BTC
   *
   * @throws LombardError if `assetIn` names no withdrawable asset
   */
  withdraw(params: EvmWithdrawParams): IEvmWithdraw;
  withdraw(params: EvmUnstakeParams): IEvmUnstake;
  withdraw(params: EvmRedeemParams): IEvmRedeem;
  /**
   * The arm for a caller holding a runtime asset rather than a literal — a form
   * picked in a UI, say. The precise interface cannot be known statically, so
   * the union comes back and the caller narrows.
   */
  withdraw(params: EvmAssetWithdrawParams): IEvmUnstake | IEvmRedeem;
  withdraw(
    params: EvmWithdrawParams | EvmAssetWithdrawParams,
  ): IEvmWithdraw | IEvmUnstake | IEvmRedeem {
    // A vault exit names a protocol and no input asset: the shares it burns
    // have no AssetId. That absence is what separates the arms.
    if (!('assetIn' in params)) {
      return createEvmWithdraw(this.ctx, params);
    }

    if (params.assetIn === AssetId.LBTC) {
      return createEvmUnstake(this.ctx, params as EvmUnstakeParams);
    }

    if (params.assetIn === AssetId.BTCb) {
      return createEvmRedeem(this.ctx, params as EvmRedeemParams);
    }

    throw new LombardError(
      ValidationErrorCode.INVALID_ASSET,
      `Cannot withdraw ${String(params.assetIn)} on EVM. ` +
        `Supported: ${AssetId.LBTC}, ${AssetId.BTCb}, or a vault protocol.`,
    );
  }

  /**
   * Cancel a pending withdrawal from DeFi protocols
   *
   * Cancels a previously queued withdrawal request.
   *
   * @example
   * ```typescript
   * const cancelWithdraw = evm.cancelWithdraw({
   *   protocol: DeployProtocol.Veda,
   *   chain: Chain.ETHEREUM,
   * });
   * await cancelWithdraw.prepare();
   * await cancelWithdraw.execute();
   * ```
   */
  cancelWithdraw(params: EvmCancelWithdrawParams): IEvmCancelWithdraw {
    return createEvmCancelWithdraw(this.ctx, params);
  }

}

/**
 * Create EVM actions from config
 *
 * Factory function that creates EvmActions for EVM operations.
 *
 * @param config - LombardConfig instance
 * @returns EvmActions instance
 */
export function evmActions(config: LombardConfig): EvmActions {
  return new EvmActions(config);
}
