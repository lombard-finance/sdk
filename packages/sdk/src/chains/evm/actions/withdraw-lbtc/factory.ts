/**
 * EVM Unstake Factory Functions
 *
 * @module chains/evm/actions/withdraw-lbtc/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { EvmCoreContext } from '../../../../shared/context';
import { createEvmCoreContext } from '../../../../shared/context';
import { EvmWithdrawLbtc } from './EvmWithdrawLbtc';
import type { EvmWithdrawLbtcParams } from './types';

/**
 * Create EvmWithdrawLbtc action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const unstake = sdk.chain.evm.unstake({
 *   sourceChain: Chain.ETHEREUM,
 *   assetOut: AssetId.BTC,
 * });
 * await unstake.prepare({ amount: '0.1', recipient: 'bc1q...' });
 * ```
 */
export function evmUnstake(
  config: LombardConfig,
  params: EvmWithdrawLbtcParams,
): EvmWithdrawLbtc {
  const ctx = createEvmCoreContext(config);
  return new EvmWithdrawLbtc(ctx, params);
}

/**
 * Create EvmWithdrawLbtc action from context
 */
export function createEvmUnstake(
  ctx: EvmCoreContext,
  params: EvmWithdrawLbtcParams,
): EvmWithdrawLbtc {
  return new EvmWithdrawLbtc(ctx, params);
}
