/**
 * BTC Deposit Factory Functions
 *
 * Provides factory functions for creating BtcDeposit instances.
 * Separates instantiation from the main class.
 *
 * @module chains/btc/actions/deposit/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { BtcCoreContext } from '../../../../shared/context';
import { createBtcCoreContext } from '../../../../shared/context';
import { BtcDeposit } from './BtcDeposit';
import type { BtcDepositParams } from './types';

/**
 * Create BtcDeposit action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { ... } });
 * const deposit = sdk.chain.btc.deposit({
 *   assetOut: AssetId.BTCb,
 *   destChain: Chain.AVALANCHE,
 * });
 * await deposit.prepare({ amount: '0.1', recipient: '0x...' });
 * ```
 */
export function btcDeposit(
  config: LombardConfig,
  params: BtcDepositParams,
): BtcDeposit {
  const ctx = createBtcCoreContext(config);
  return new BtcDeposit(ctx, params);
}

/**
 * Create BtcDeposit action from context
 *
 * Use this when you already have a BtcCoreContext (e.g., in BtcActions).
 *
 * @param ctx - BtcCoreContext
 * @param params - Deposit parameters
 * @returns BtcDeposit instance
 */
export function createBtcDeposit(
  ctx: BtcCoreContext,
  params: BtcDepositParams,
): BtcDeposit {
  return new BtcDeposit(ctx, params);
}
