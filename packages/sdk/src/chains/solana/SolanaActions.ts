/**
 * Solana Actions
 *
 * Provides factory methods for Solana operations.
 *
 * Operations:
 * - stake: BTC.b → LBTC (stake wrapped BTC to get LBTC)
 * - unstake: LBTC → BTC (cross-chain) or LBTC → BTC.b (same-chain)
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
import { AssetId } from '../../core';
import { CapabilityRegistry } from '../../modules/CapabilityRegistry';
import type { SolanaCoreContext } from '../../shared/context';
import { LombardError, ValidationErrorCode } from '../../shared/errors';
import { SolanaRedeem } from './actions/redeem/SolanaRedeem';
import type { ISolanaRedeem, SolanaRedeemParams } from './actions/redeem/types';
import { SolanaStake } from './actions/stake/SolanaStake';
import type { ISolanaStake, SolanaStakeParams } from './actions/stake/types';
import { SolanaUnstake } from './actions/unstake/SolanaUnstake';
import type {
  ISolanaUnstake,
  SolanaUnstakeParams,
} from './actions/unstake/types';

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
  deposit(params: SolanaStakeParams): ISolanaStake {
    return new SolanaStake(this.ctx, params);
  }

  /**
   * @deprecated Use {@link deposit} instead. Removed in the next major.
   */
  stake(params: SolanaStakeParams): ISolanaStake {
    return this.deposit(params);
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
  withdraw(
    params: SolanaUnstakeParams | SolanaRedeemParams,
  ): ISolanaUnstake | ISolanaRedeem {
    if (params.assetIn === AssetId.LBTC) {
      return new SolanaUnstake(this.ctx, params as SolanaUnstakeParams);
    }

    if (params.assetIn === AssetId.BTCb) {
      return new SolanaRedeem(this.ctx, params as SolanaRedeemParams);
    }

    // Dispatching on an asset with no route would otherwise pick a class
    // arbitrarily and fail later, inside a flow the caller has already started.
    throw new LombardError(
      ValidationErrorCode.INVALID_ASSET,
      `Cannot withdraw ${String(params.assetIn)} on Solana. ` +
        `Supported: ${AssetId.LBTC}, ${AssetId.BTCb}.`,
    );
  }

  /**
   * Unstake LBTC → BTC (cross-chain) or LBTC → BTC.b (same-chain)
   *
   * Burns LBTC on Solana and outputs BTC or BTC.b depending on `assetOut`:
   * - BTC: via LBTC program directly (cross-chain to Bitcoin)
   * - BTC.b: via Asset Router redeem (same-chain on Solana)
   *
   * @throws LombardError if solana module is not registered
   * @throws LombardError if route is not supported
   */
  /**
   * @deprecated Use {@link withdraw} instead, which dispatches on `assetIn`.
   * Removed in the next major.
   */
  unstake(params: SolanaUnstakeParams): ISolanaUnstake {
    return new SolanaUnstake(this.ctx, params);
  }

  /**
   * Redeem BTC.b → BTC (cross-chain)
   *
   * Burns BTC.b on Solana and releases BTC to a Bitcoin address via Asset Router.
   *
   * @throws LombardError if solana module is not registered
   * @throws LombardError if route is not supported
   */
  /**
   * @deprecated Use {@link withdraw} instead, which dispatches on `assetIn`.
   * Removed in the next major.
   */
  redeem(params: SolanaRedeemParams): ISolanaRedeem {
    return new SolanaRedeem(this.ctx, params);
  }
}

/**
 * Create Solana actions from config
 */
export function solanaActions(config: LombardConfig): SolanaActions {
  return new SolanaActions(config);
}
