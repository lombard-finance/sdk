/**
 * Token Utilities for BTC Actions
 *
 * Shared utilities for mapping asset IDs to tokens.
 *
 * ## Token Parameter Pattern for StakeAndBake/DepositAndDeploy
 *
 * The `token` parameter in authorization functions determines which DEFI_REGISTRY
 * entry is used, which affects the `amountStrategy`:
 *
 * | Action              | Flow               | Token Param   | Strategy    | Reason                     |
 * |---------------------|-------------------|---------------|-------------|----------------------------|
 * | BtcDeployLbtc   | BTC → LBTC → Vault | AssetId.BTC  | btcToLbtc   | Apply BTC/LBTC ratio       |
 * | BtcDeployBtcb | BTC → BTCb → Vault | Token.BTCb   | identity    | 1:1 ratio, no conversion   |
 *
 * **Key Insight:**
 * - LBTC has a variable exchange rate with BTC (~1.00265 BTC = 1 LBTC)
 * - BTC.b is 1:1 with BTC (wrapped representation)
 *
 * For LBTC outputs, use the SOURCE asset (`'BTC'`) to trigger ratio conversion.
 * For BTC.b outputs, use the OUTPUT asset (`Token.BTCb`) since no conversion needed.
 *
 * @see DEFI_REGISTRY in defi/defi-registry.ts
 * @see signStakeAndBake for how amountStrategy is applied
 *
 * @module chains/btc/actions/shared/tokenUtils
 */

import { AssetId } from '../../../../core/assets';
import { Token } from '../../../../tokens/token-addresses';

/**
 * Maps an AssetId to its corresponding Token value for API calls.
 *
 * **Note:** This function handles LBTC and BTCb. For BTC → LBTC flows that need
 * ratio conversion, use `AssetId.BTC` directly instead of this function.
 *
 * @param assetId - The asset ID to convert
 * @param defaultToken - The default token if assetId doesn't match known types (defaults to LBTC)
 * @returns The corresponding Token value
 *
 * @example
 * // For BTC.b outputs (1:1 with BTC)
 * assetIdToToken(AssetId.BTCb) // returns Token.BTCb
 *
 * @example
 * // For LBTC outputs from LBTC source (no ratio conversion)
 * assetIdToToken(AssetId.LBTC) // returns Token.LBTC
 *
 * @example
 * // For BTC → LBTC (needs ratio conversion)
 * // DON'T use assetIdToToken, use AssetId.BTC directly
 * token: AssetId.BTC // triggers btcToLbtc strategy
 */
export function assetIdToToken(
  assetId: AssetId,
  defaultToken: Token = Token.LBTC,
): Token {
  switch (assetId) {
    case AssetId.LBTC:
      return Token.LBTC;
    case AssetId.BTCb:
      return Token.BTCb;
    default:
      return defaultToken;
  }
}
