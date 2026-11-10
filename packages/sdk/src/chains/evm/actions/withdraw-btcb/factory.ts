/**
 * EVM Redeem Factory Functions
 *
 * @module chains/evm/actions/withdraw-btcb/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { EvmCoreContext } from '../../../../shared/context';
import { createEvmCoreContext } from '../../../../shared/context';
import { EvmWithdrawBtcb } from './EvmWithdrawBtcb';
import type { EvmWithdrawBtcbParams } from './types';

/**
 * Create EvmWithdrawBtcb action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const redeem = sdk.chain.evm.redeem({
 *   assetIn: AssetId.BTCb,
 *   assetOut: AssetId.BTC,
 *   sourceChain: Chain.AVALANCHE,
 *   destChain: Chain.BITCOIN_MAINNET,
 * });
 * await redeem.prepare({ amount: '0.1', recipient: 'bc1q...' });
 * await redeem.execute();
 * ```
 */
export function evmRedeem(
  config: LombardConfig,
  params: EvmWithdrawBtcbParams,
): EvmWithdrawBtcb {
  const ctx = createEvmCoreContext(config);
  return new EvmWithdrawBtcb(ctx, params);
}

/**
 * Create EvmWithdrawBtcb action from context
 */
export function createEvmRedeem(
  ctx: EvmCoreContext,
  params: EvmWithdrawBtcbParams,
): EvmWithdrawBtcb {
  return new EvmWithdrawBtcb(ctx, params);
}
