/**
 * EVM Unstake Factory Functions
 *
 * @module chains/evm/actions/unstake/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { EvmCoreContext } from '../../../../shared/context';
import { createEvmCoreContext } from '../../../../shared/context';
import { EvmUnstake } from './EvmUnstake';
import type { EvmUnstakeParams } from './types';

/**
 * Create EvmUnstake action from config
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
  params: EvmUnstakeParams,
): EvmUnstake {
  const ctx = createEvmCoreContext(config);
  return new EvmUnstake(ctx, params);
}

/**
 * Create EvmUnstake action from context
 */
export function createEvmUnstake(
  ctx: EvmCoreContext,
  params: EvmUnstakeParams,
): EvmUnstake {
  return new EvmUnstake(ctx, params);
}
