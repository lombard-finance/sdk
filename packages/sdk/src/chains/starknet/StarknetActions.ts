/**
 * Starknet Actions
 *
 * Provides factory methods for Starknet operations (unstake).
 *
 * Note: Starknet module must be registered before using these actions.
 *
 * @example
 * ```typescript
 * import { starknetActions } from '@lombard.finance/sdk';
 *
 * const starknet = starknetActions(config);
 * const unstake = starknet.unstake({ ... });
 * ```
 */

import type { StarknetService } from '@lombard.finance/sdk-common';

import { PartnerConfiguration } from '../../client/PartnerConfiguration';
import type { LombardConfig } from '../../config/types';
import { getProviderGetter } from '../../config/types';
import { CapabilityRegistry } from '../../modules/CapabilityRegistry';
import type { StarknetCoreContext } from '../../shared/context';
import { StarknetUnstake } from './actions/unstake/StarknetUnstake';
import type {
  IStarknetUnstake,
  StarknetUnstakeParams,
} from './actions/unstake/types';

/**
 * Create Starknet core context from config
 * Only called when an action is invoked (lazy initialization)
 */
function createStarknetCoreContext(config: LombardConfig): StarknetCoreContext {
  const registry = new CapabilityRegistry(config.modules, config);
  const starknet = registry.require('starknet') as StarknetService;

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
    starknet,
  };
}

/**
 * Starknet Actions
 *
 * Actions are lazy-loaded - the starknet module is only required when
 * an action is actually called.
 */
export class StarknetActions {
  private _ctx: StarknetCoreContext | null = null;

  constructor(private readonly config: LombardConfig) {}

  private get ctx(): StarknetCoreContext {
    if (!this._ctx) {
      this._ctx = createStarknetCoreContext(this.config);
    }
    return this._ctx;
  }

  /**
   * Unstake LBTC → BTC
   *
   * Burns LBTC on Starknet and releases BTC on Bitcoin.
   *
   * @throws LombardError if starknet module is not registered
   */
  /**
   * Withdraw LBTC to BTC.
   *
   * Burns LBTC on Starknet and releases BTC on Bitcoin. Named `withdraw` under the
   * three-verb model: an L-asset in, an asset out.
   */
  withdraw(params: StarknetUnstakeParams): IStarknetUnstake {
    return new StarknetUnstake(this.ctx, params);
  }

  /**
   * @deprecated Use {@link withdraw} instead. Removed in the next major.
   */
  unstake(params: StarknetUnstakeParams): IStarknetUnstake {
    return this.withdraw(params);
  }
}

/**
 * Create Starknet actions from config
 */
export function starknetActions(config: LombardConfig): StarknetActions {
  return new StarknetActions(config);
}
