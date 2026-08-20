/**
 * Sui Actions
 *
 * Provides factory methods for Sui operations (unstake).
 *
 * Note: Sui module must be registered before using these actions.
 *
 * @example
 * ```typescript
 * import { suiActions } from '@lombard.finance/sdk';
 *
 * const sui = suiActions(config);
 * const unstake = sui.unstake({ ... });
 * ```
 */

import type { SuiService } from '@lombard.finance/sdk-common';

import { PartnerConfiguration } from '../../client/PartnerConfiguration';
import type { LombardConfig } from '../../config/types';
import { getProviderGetter } from '../../config/types';
import { CapabilityRegistry } from '../../modules/CapabilityRegistry';
import type { SuiCoreContext } from '../../shared/context';
import { SuiUnstake } from './actions/unstake/SuiUnstake';
import type { ISuiUnstake, SuiUnstakeParams } from './actions/unstake/types';

/**
 * Create Sui core context from config
 * Only called when an action is invoked (lazy initialization)
 */
function createSuiCoreContext(config: LombardConfig): SuiCoreContext {
  const registry = new CapabilityRegistry(config.modules, config);
  const sui = registry.require('sui') as SuiService;

  return {
    env: config.env,
    partner: new PartnerConfiguration(config.partner),
    getAuthToken: config.getAuthToken,
    getProvider: async (key) => {
      const getter = getProviderGetter(config.providers, key);
      if (!getter) return undefined;
      return getter();
    },
    sui,
  };
}

/**
 * Sui Actions
 *
 * Actions are lazy-loaded - the sui module is only required when
 * an action is actually called.
 */
export class SuiActions {
  private _ctx: SuiCoreContext | null = null;

  constructor(private readonly config: LombardConfig) {}

  private get ctx(): SuiCoreContext {
    if (!this._ctx) {
      this._ctx = createSuiCoreContext(this.config);
    }
    return this._ctx;
  }

  /**
   * Unstake LBTC → BTC
   *
   * Burns LBTC on Sui and releases BTC on Bitcoin.
   *
   * @throws LombardError if sui module is not registered
   */
  /**
   * Withdraw LBTC to BTC.
   *
   * Burns LBTC on Sui and releases BTC on Bitcoin. Named `withdraw` under the
   * three-verb model: an L-asset in, an asset out.
   */
  withdraw(params: SuiUnstakeParams): ISuiUnstake {
    return new SuiUnstake(this.ctx, params);
  }

  /**
   * @deprecated Use {@link withdraw} instead. Removed in the next major.
   */
  unstake(params: SuiUnstakeParams): ISuiUnstake {
    return this.withdraw(params);
  }
}

/**
 * Create Sui actions from config
 */
export function suiActions(config: LombardConfig): SuiActions {
  return new SuiActions(config);
}
