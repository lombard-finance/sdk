/**
 * BTC Stake Factory Functions
 *
 * Provides factory functions for creating BtcStake instances.
 * Separates instantiation from the main class.
 *
 * @module chains/btc/actions/stake/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { BtcCoreContext } from '../../../../shared/context';
import { createBtcCoreContext } from '../../../../shared/context';
import { BtcStake } from './BtcStake';
import type { BtcStakeParams } from './types';

/**
 * Create BtcStake action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { ... } });
 * const stake = sdk.chain.btc.stake({
 *   assetOut: AssetId.LBTC,
 *   destChain: Chain.ETHEREUM,
 * });
 * await stake.prepare({ amount: '0.1', recipient: '0x...' });
 * ```
 */
export function btcStake(
  config: LombardConfig,
  params: BtcStakeParams,
): BtcStake {
  const ctx = createBtcCoreContext(config);
  return new BtcStake(ctx, params);
}

/**
 * Create BtcStake action from context
 *
 * Use this when you already have a BtcCoreContext (e.g., in BtcActions).
 *
 * @param ctx - BtcCoreContext
 * @param params - Stake parameters
 * @returns BtcStake instance
 */
export function createBtcStake(
  ctx: BtcCoreContext,
  params: BtcStakeParams,
): BtcStake {
  return new BtcStake(ctx, params);
}
