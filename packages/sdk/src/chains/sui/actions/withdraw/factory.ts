/**
 * Sui Unstake Factory Functions
 *
 * @module chains/sui/actions/withdraw/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { SuiCoreContext } from '../../../../shared/context';
import { SuiWithdraw } from './SuiWithdraw';
import type { ISuiWithdraw, SuiWithdrawParams } from './types';

/**
 * Create Sui unstake from context
 */
export function createSuiUnstake(
  ctx: SuiCoreContext,
  params: SuiWithdrawParams,
): ISuiWithdraw {
  return new SuiWithdraw(ctx, params);
}

/**
 * Create Sui unstake from config
 */
export function suiUnstake(
  _config: LombardConfig,
  _params: SuiWithdrawParams,
): ISuiWithdraw {
  throw new Error(
    'suiUnstake() from config is not yet supported. Use sdk.chain.sui.unstake() instead.',
  );
}
