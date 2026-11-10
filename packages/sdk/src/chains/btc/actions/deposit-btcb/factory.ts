/**
 * BTC Deposit Factory Functions
 *
 * Provides factory functions for creating BtcDepositBtcb instances.
 * Separates instantiation from the main class.
 *
 * @module chains/btc/actions/deposit-btcb/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { BtcCoreContext } from '../../../../shared/context';
import { createBtcCoreContext } from '../../../../shared/context';
import { BtcDepositBtcb } from './BtcDepositBtcb';
import type { BtcDepositBtcbParams } from './types';

/**
 * Create BtcDepositBtcb action from config
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
  params: BtcDepositBtcbParams,
): BtcDepositBtcb {
  const ctx = createBtcCoreContext(config);
  return new BtcDepositBtcb(ctx, params);
}

/**
 * Create BtcDepositBtcb action from context
 *
 * Use this when you already have a BtcCoreContext (e.g., in BtcActions).
 *
 * @param ctx - BtcCoreContext
 * @param params - Deposit parameters
 * @returns BtcDepositBtcb instance
 */
export function createBtcDeposit(
  ctx: BtcCoreContext,
  params: BtcDepositBtcbParams,
): BtcDepositBtcb {
  return new BtcDepositBtcb(ctx, params);
}
