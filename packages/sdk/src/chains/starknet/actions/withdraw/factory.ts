/**
 * Starknet Unstake Factory Functions
 *
 * @module chains/starknet/actions/withdraw/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { StarknetCoreContext } from '../../../../shared/context';
import { StarknetWithdraw } from './StarknetWithdraw';
import type { IStarknetWithdraw, StarknetWithdrawParams } from './types';

/**
 * Create Starknet unstake from context
 */
export function createStarknetUnstake(
  ctx: StarknetCoreContext,
  params: StarknetWithdrawParams,
): IStarknetWithdraw {
  return new StarknetWithdraw(ctx, params);
}

/**
 * Create Starknet unstake from config
 */
export function starknetUnstake(
  _config: LombardConfig,
  _params: StarknetWithdrawParams,
): IStarknetWithdraw {
  throw new Error(
    'starknetUnstake() from config is not yet supported. Use sdk.chain.starknet.unstake() instead.',
  );
}
