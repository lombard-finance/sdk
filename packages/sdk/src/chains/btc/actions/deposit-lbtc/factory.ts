/**
 * BTC Stake Factory Functions
 *
 * Provides factory functions for creating BtcDepositLbtc instances.
 * Separates instantiation from the main class.
 *
 * @module chains/btc/actions/deposit-lbtc/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { BtcCoreContext } from '../../../../shared/context';
import { createBtcCoreContext } from '../../../../shared/context';
import { BtcDepositLbtc } from './BtcDepositLbtc';
import type { BtcDepositLbtcParams } from './types';

/**
 * Create BtcDepositLbtc action from config
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
  params: BtcDepositLbtcParams,
): BtcDepositLbtc {
  const ctx = createBtcCoreContext(config);
  return new BtcDepositLbtc(ctx, params);
}

/**
 * Create BtcDepositLbtc action from context
 *
 * Use this when you already have a BtcCoreContext (e.g., in BtcActions).
 *
 * @param ctx - BtcCoreContext
 * @param params - Stake parameters
 * @returns BtcDepositLbtc instance
 */
export function createBtcStake(
  ctx: BtcCoreContext,
  params: BtcDepositLbtcParams,
): BtcDepositLbtc {
  return new BtcDepositLbtc(ctx, params);
}
