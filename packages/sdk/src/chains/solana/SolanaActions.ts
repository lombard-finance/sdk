/**
 * Solana Actions
 *
 * Provides factory methods for Solana operations.
 *
 * Operations:
 * - stake: BTC.b → LBTC (stake wrapped BTC to get LBTC)
 * - withdraw: LBTC → BTC (cross-chain) or LBTC → BTC.b (same-chain)
 * - redeem: BTC.b → BTC (cross-chain via Asset Router)
 *
 * Note: Solana module must be registered before using these actions.
 *
 * @example
 * ```typescript
 * import { solanaActions } from '@lombard.finance/sdk';
 *
 * const solana = solanaActions(config);
 * const stake = solana.stake({ ... });
 * ```
 */

import type { SolanaService } from '@lombard.finance/sdk-common';

import { PartnerConfiguration } from '../../client/PartnerConfiguration';
import type { LombardConfig } from '../../config/types';
import { getProviderGetter } from '../../config/types';
import type { Chain } from '../../core';
import { AssetId } from '../../core';
import { CapabilityRegistry } from '../../modules/CapabilityRegistry';
import type { SolanaCoreContext } from '../../shared/context';
import { LombardError, ValidationErrorCode } from '../../shared/errors';
import { SolanaDepositBtcb } from './actions/deposit-btcb/SolanaDepositBtcb';
import type { ISolanaDepositBtcb, SolanaDepositBtcbParams } from './actions/deposit-btcb/types';
import { SolanaWithdrawBtcb } from './actions/withdraw-btcb/SolanaWithdrawBtcb';
import type { ISolanaWithdrawBtcb, SolanaWithdrawBtcbParams } from './actions/withdraw-btcb/types';
import { SolanaWithdrawLbtc } from './actions/withdraw-lbtc/SolanaWithdrawLbtc';
import type {
  ISolanaWithdrawLbtc,
  SolanaWithdrawLbtcParams,
} from './actions/withdraw-lbtc/types';

/**
 * Create Solana core context from config
 * Only called when an action is invoked (lazy initialization)
 */
function createSolanaCoreContext(config: LombardConfig): SolanaCoreContext {
  const registry = new CapabilityRegistry(config.modules, config);
  const solana = registry.require('solana') as SolanaService;

  return {
    env: config.env,
    partner: new PartnerConfiguration(config.partner),
    auth: config.auth,
    getAuthToken: config.getAuthToken,
    getProvider: async (key) => {
      const getter = getProviderGetter(config.providers, key);
      if (!getter) return undefined;
      return getter();
    },
    solana,
  };
}

/**
 * Solana Actions
 *
 * Actions are lazy-loaded - the solana module is only required when
 * an action is actually called.
 */
/**
 * A withdrawal whose input asset is only known at runtime.
 *
 * The withdraw and redeem parameter types are structurally identical apart from
 * the `assetIn` literal that tells them apart, so this is that shape with the
 * discriminant widened — without it a caller passing a plain `AssetId` matches
 * no overload.
 */
export interface SolanaAssetWithdrawParams {
  assetIn: AssetId;
  assetOut: AssetId;
  sourceChain: Chain;
  destChain: Chain;
}

export class SolanaActions {
  private _ctx: SolanaCoreContext | null = null;

  constructor(private readonly config: LombardConfig) {}

  private get ctx(): SolanaCoreContext {
    if (!this._ctx) {
      this._ctx = createSolanaCoreContext(this.config);
    }
    return this._ctx;
  }

  /**
   * Stake BTC.b → LBTC
   *
   * Burns BTC.b on Solana and mints LBTC to the recipient via Asset Router.
   *
   * @throws LombardError if solana module is not registered
   * @throws LombardError if route is not supported
   */
  /**
   * Deposit BTC.b into LBTC on Solana.
   *
   * Named `deposit` under the three-verb model: an asset in, an L-asset out.
   */
  deposit(params: SolanaDepositBtcbParams): ISolanaDepositBtcb {
    return new SolanaDepositBtcb(this.ctx, params);
  }

  /**
   * Withdraw an L-asset back out.
   *
   * One method for what were two, dispatching on `assetIn` — which is the only
   * thing that distinguished them:
   *
   * - `assetIn: LBTC` burns LBTC, releasing BTC cross-chain or BTC.b same-chain
   * - `assetIn: BTC.b` burns BTC.b, releasing BTC via the Asset Router
   *
   * @throws LombardError if `assetIn` is neither LBTC nor BTC.b
   */
  withdraw(params: SolanaWithdrawLbtcParams): ISolanaWithdrawLbtc;
  withdraw(params: SolanaWithdrawBtcbParams): ISolanaWithdrawBtcb;
  /**
   * The arm for a caller holding a runtime asset rather than a literal. The
   * precise interface cannot be known statically, so the union comes back.
   */
  withdraw(params: SolanaAssetWithdrawParams): ISolanaWithdrawLbtc | ISolanaWithdrawBtcb;
  withdraw(
    params: SolanaAssetWithdrawParams,
  ): ISolanaWithdrawLbtc | ISolanaWithdrawBtcb {
    if (params.assetIn === AssetId.LBTC) {
      return new SolanaWithdrawLbtc(this.ctx, params as SolanaWithdrawLbtcParams);
    }

    if (params.assetIn === AssetId.BTCb) {
      return new SolanaWithdrawBtcb(this.ctx, params as SolanaWithdrawBtcbParams);
    }

    // Dispatching on an asset with no route would otherwise pick a class
    // arbitrarily and fail later, inside a flow the caller has already started.
    throw new LombardError(
      ValidationErrorCode.INVALID_ASSET,
      `Cannot withdraw ${String(params.assetIn)} on Solana. ` +
        `Supported: ${AssetId.LBTC}, ${AssetId.BTCb}.`,
    );
  }

}

/**
 * Create Solana actions from config
 */
export function solanaActions(config: LombardConfig): SolanaActions {
  return new SolanaActions(config);
}
