/**
 * Sui Withdraw Factory Functions
 *
 * @module chains/sui/actions/withdraw/factory
 */

import type { LombardConfig } from '../../../../config/types';
import type { SuiCoreContext } from '../../../../shared/context';
import { SuiWithdraw } from './SuiWithdraw';
import type { ISuiWithdraw, SuiWithdrawParams } from './types';

/**
 * Create Sui withdraw from context
 */
export function createSuiWithdraw(
  ctx: SuiCoreContext,
  params: SuiWithdrawParams,
): ISuiWithdraw {
  return new SuiWithdraw(ctx, params);
}

/**
 * Create Sui withdraw from config
 */
export function suiWithdraw(
  _config: LombardConfig,
  _params: SuiWithdrawParams,
): ISuiWithdraw {
  throw new Error(
    'suiWithdraw() from config is not yet supported. Use sdk.chain.sui.withdraw() instead.',
  );
}
