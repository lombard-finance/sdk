/**
 * Starknet Withdraw Factory Functions
 *
 * @module chains/starknet/actions/withdraw/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { StarknetCoreContext } from '../../../../shared/context';
import { StarknetWithdraw } from './StarknetWithdraw';
import type { IStarknetWithdraw, StarknetWithdrawParams } from './types';

/**
 * Create Starknet withdraw from context
 */
export function createStarknetWithdraw(
  ctx: StarknetCoreContext,
  params: StarknetWithdrawParams,
): IStarknetWithdraw {
  return new StarknetWithdraw(ctx, params);
}

/**
 * Create Starknet withdraw from config
 */
export function starknetWithdraw(
  _config: LombardConfig,
  _params: StarknetWithdrawParams,
): IStarknetWithdraw {
  throw new Error(
    'starknetWithdraw() from config is not yet supported. Use sdk.chain.starknet.withdraw() instead.',
  );
}
