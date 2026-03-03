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
 * - redeem: LBTC → BTC.b (same-chain unwrap)
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
import type { EvmCoreContext } from '../../shared/context';
import { createEvmCoreContext } from '../../shared/context';
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
  stake(params: EvmStakeParams): IEvmStake {
    return createEvmStake(this.ctx, params);
  }

  /**
   * Unstake LBTC to BTC or BTC.b
   *
   * - LBTC → BTC: Cross-chain to Bitcoin mainnet/signet
   * - LBTC → BTC.b: Same-chain wrapped BTC on EVM
   *
   * @example
   * ```typescript
   * const unstake = evm.unstake({
   *   assetIn: AssetId.LBTC,
   *   assetOut: AssetId.BTC,
   *   sourceChain: Chain.ETHEREUM,
   *   destChain: Chain.BITCOIN_MAINNET,
   * });
   * ```
   */
  unstake(params: EvmUnstakeParams): IEvmUnstake {
    return createEvmUnstake(this.ctx, params);
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
  deposit(params: EvmDepositParams): IEvmDeposit {
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
  withdraw(params: EvmWithdrawParams): IEvmWithdraw {
    return createEvmWithdraw(this.ctx, params);
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

  /**
   * Redeem LBTC to BTC.b (same-chain unwrap)
   *
   * Converts LBTC to BTC.b on the same EVM chain.
   * For cross-chain BTC redemption, use unstake() with destChain set to Bitcoin.
   *
   * @example
   * ```typescript
   * const redeem = evm.redeem({
   *   assetIn: AssetId.LBTC,
   *   assetOut: AssetId.BTCb,
   *   sourceChain: Chain.AVALANCHE,
   * });
   * ```
   */
  redeem(params: EvmRedeemParams): IEvmRedeem {
    return createEvmRedeem(this.ctx, params);
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
