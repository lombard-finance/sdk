/**
 * EVM Deposit Factory Functions
 *
 * @module chains/evm/actions/claim/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { EvmCoreContext } from '../../../../shared/context';
import { createEvmCoreContext } from '../../../../shared/context';
import { EvmClaim } from './EvmClaim';
import type { EvmClaimParams } from './types';

/**
 * Create EvmClaim action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const deposit = sdk.chain.evm.deposit({
 *   sourceChain: Chain.ETHEREUM,
 *   assetIn: AssetId.BTCb,
 * });
 * await deposit.prepare({ amount: '0.1' });
 * ```
 */
export function evmDeposit(
  config: LombardConfig,
  params: EvmClaimParams,
): EvmClaim {
  const ctx = createEvmCoreContext(config);
  return new EvmClaim(ctx, params);
}

/**
 * Create EvmClaim action from context
 */
export function createEvmDeposit(
  ctx: EvmCoreContext,
  params: EvmClaimParams,
): EvmClaim {
  return new EvmClaim(ctx, params);
}
