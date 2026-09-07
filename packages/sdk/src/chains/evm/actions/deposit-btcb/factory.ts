/**
 * EVM Stake Factory Functions
 *
 * Provides factory functions for creating EvmDepositBtcb instances.
 *
 * @module chains/evm/actions/deposit-btcb/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { EvmCoreContext } from '../../../../shared/context';
import { createEvmCoreContext } from '../../../../shared/context';
import { EvmDepositBtcb } from './EvmDepositBtcb';
import type { EvmDepositBtcbParams } from './types';

/**
 * Create EvmDepositBtcb action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const stake = sdk.chain.evm.stake({
 *   sourceChain: Chain.ETHEREUM,
 *   destChain: Chain.ETHEREUM,
 * });
 * await stake.prepare({ amount: '0.1' });
 * ```
 */
export function evmStake(
  config: LombardConfig,
  params: EvmDepositBtcbParams,
): EvmDepositBtcb {
  const ctx = createEvmCoreContext(config);
  return new EvmDepositBtcb(ctx, params);
}

/**
 * Create EvmDepositBtcb action from context
 *
 * Use this when you already have an EvmCoreContext (e.g., in EvmActions).
 *
 * @param ctx - EvmCoreContext
 * @param params - Stake parameters
 * @returns EvmDepositBtcb instance
 */
export function createEvmStake(
  ctx: EvmCoreContext,
  params: EvmDepositBtcbParams,
): EvmDepositBtcb {
  return new EvmDepositBtcb(ctx, params);
}
