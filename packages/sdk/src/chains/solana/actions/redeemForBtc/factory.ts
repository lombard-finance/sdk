/**
 * Solana RedeemForBtc Factory Functions
 *
 * @module chains/solana/actions/redeemForBtc/factory
 */

import type { SolanaCoreContext } from '../../../../shared/context';
import { SolanaRedeemForBtc } from './SolanaRedeemForBtc';
import type { ISolanaRedeemForBtc, SolanaRedeemForBtcParams } from './types';

export function createSolanaRedeemForBtc(
  ctx: SolanaCoreContext,
  params: SolanaRedeemForBtcParams,
): ISolanaRedeemForBtc {
  return new SolanaRedeemForBtc(ctx, params);
}
