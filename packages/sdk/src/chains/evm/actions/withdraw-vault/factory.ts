/**
 * EVM Withdraw Factory Functions
 *
 * @module chains/evm/actions/withdraw-vault/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { EvmCoreContext } from '../../../../shared/context';
import { createEvmCoreContext } from '../../../../shared/context';
import { EvmCancelWithdraw } from './EvmCancelWithdraw';
import { EvmWithdrawVault } from './EvmWithdrawVault';
import type { EvmCancelWithdrawParams, EvmWithdrawVaultParams } from './types';

/**
 * Create EvmWithdrawVault action from config
 *
 * @internal This factory is for internal use. Use createLombardSDK() instead:
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const withdraw = sdk.chain.evm.withdraw({
 *   sourceChain: Chain.ETHEREUM,
 *   protocol: DeployProtocol.Veda,
 *   recipient: '0x...',
 * });
 * await withdraw.prepare({ amount: '0.1' });
 * if (withdraw.needsApproval) await withdraw.approve();
 * await withdraw.execute();
 * ```
 */
export function evmWithdraw(
  config: LombardConfig,
  params: EvmWithdrawVaultParams,
): EvmWithdrawVault {
  const ctx = createEvmCoreContext(config);
  return new EvmWithdrawVault(ctx, params);
}

/**
 * Create EvmWithdrawVault action from context
 */
export function createEvmWithdraw(
  ctx: EvmCoreContext,
  params: EvmWithdrawVaultParams,
): EvmWithdrawVault {
  return new EvmWithdrawVault(ctx, params);
}

/**
 * Create EvmCancelWithdraw action from config
 *
 * @example
 * ```typescript
 * const sdk = await createLombardSDK({ env: Env.prod, providers: { evm: () => window.ethereum } });
 * const cancelWithdraw = sdk.chain.evm.cancelWithdraw({
 *   chain: Chain.ETHEREUM,
 *   protocol: DeployProtocol.Veda,
 * });
 * await cancelWithdraw.prepare();
 * await cancelWithdraw.execute();
 * ```
 */
export function evmCancelWithdraw(
  config: LombardConfig,
  params: EvmCancelWithdrawParams,
): EvmCancelWithdraw {
  const ctx = createEvmCoreContext(config);
  return new EvmCancelWithdraw(ctx, params);
}

/**
 * Create EvmCancelWithdraw action from context
 */
export function createEvmCancelWithdraw(
  ctx: EvmCoreContext,
  params: EvmCancelWithdrawParams,
): EvmCancelWithdraw {
  return new EvmCancelWithdraw(ctx, params);
}
