/**
 * EVM Deposit Factory Functions
 *
 * @module chains/evm/actions/deposit/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { EvmCoreContext } from '../../../../shared/context';
import { createEvmCoreContext } from '../../../../shared/context';
import { EvmDeposit } from './EvmDeposit';
import type { EvmDepositParams } from './types';

/**
 * Create EvmDeposit action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const deposit = sdk.chain.evm.deposit({
 *   sourceChain: Chain.ETHEREUM,
 *   assetIn: AssetId.WBTC,
 * });
 * await deposit.prepare({ amount: '0.1' });
 * ```
 */
export function evmDeposit(
  config: LombardConfig,
  params: EvmDepositParams,
): EvmDeposit {
  const ctx = createEvmCoreContext(config);
  return new EvmDeposit(ctx, params);
}

/**
 * Create EvmDeposit action from context
 */
export function createEvmDeposit(
  ctx: EvmCoreContext,
  params: EvmDepositParams,
): EvmDeposit {
  return new EvmDeposit(ctx, params);
}
