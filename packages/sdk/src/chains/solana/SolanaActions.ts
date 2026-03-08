/**
 * Solana Actions
 *
 * Provides factory methods for Solana operations (unstake).
 *
 * Note: Solana module must be registered before using these actions.
 *
 * @example
 * ```typescript
 * import { solanaActions } from '@lombard.finance/sdk';
 *
 * const solana = solanaActions(config);
 * const unstake = solana.unstake({ ... });
 * ```
 */

import type { SolanaService } from '@lombard.finance/sdk-common';

import { PartnerConfiguration } from '../../client/PartnerConfiguration';
import type { LombardConfig } from '../../config/types';
import { getProviderGetter } from '../../config/types';
import { CapabilityRegistry } from '../../modules/CapabilityRegistry';
import type { SolanaCoreContext } from '../../shared/context';
import { SolanaRedeem } from './actions/redeem/SolanaRedeem';
import type {
  ISolanaRedeem,
  SolanaRedeemParams,
} from './actions/redeem/types';
import { SolanaStake } from './actions/stake/SolanaStake';
import type {
  ISolanaStake,
  SolanaStakeParams,
} from './actions/stake/types';
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
    getProvider: async key => {
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
   * Converts BTC.b to LBTC via the Asset Router program on Solana.
   *
   * @throws LombardError if solana module is not registered
   * @throws LombardError if route is not supported
   */
  stake(params: SolanaStakeParams): ISolanaStake {
    return new SolanaStake(this.ctx, params);
  }

  /**
   * Unstake LBTC → BTC
   *
   * Burns LBTC on Solana and releases BTC on Bitcoin.
   *
   * @throws LombardError if solana module is not registered
   */
  unstake(params: SolanaUnstakeParams): ISolanaUnstake {
    return new SolanaUnstake(this.ctx, params);
  }

  /**
   * Redeem BTC.b → BTC
   *
   * Burns BTC.b on Solana and releases BTC to a Bitcoin address via GMP.
   *
   * @throws LombardError if solana module is not registered
   * @throws LombardError if route is not supported
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
