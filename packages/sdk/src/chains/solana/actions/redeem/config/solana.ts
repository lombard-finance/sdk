/**
 * Solana Redeem Configuration
 *
 * Handles redeeming BTC.b on Solana → BTC on Bitcoin via Asset Router + GMP.
 *
 * @module chains/solana/actions/redeem/config/solana
 */

import { Env } from "@lombard.finance/sdk-common";

import { AssetId, Chain } from "../../../../../core";
import { bitcoinAddressSchema } from "../../../../../shared/validation";
import type { ChainConfig } from "./types";

/**
 * BTC.b → BTC redeem configuration on Solana
 *
 * Burns BTC.b via the Asset Router program and sends a GMP message
 * to trigger a BTC payout on the Bitcoin network.
 */
export const solanaRedeemConfig: ChainConfig = {
  chainType: "solana",

  routes: [
    {
      sourceChains: [Chain.SOLANA_DEVNET],
      destChain: Chain.BITCOIN_SIGNET,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      envs: [Env.stage, Env.dev],
    },
  ],

  recipientSchema: bitcoinAddressSchema,
};

/**
 * Check if BTC.b → BTC redeem is supported for the full route
 */
export function isRedeemSupported(
  sourceChain: Chain,
  destChain: Chain,
  assetIn: AssetId,
  assetOut: AssetId,
  env: Env,
): boolean {
  return solanaRedeemConfig.routes.some(
    (route) =>
      route.sourceChains.includes(sourceChain) &&
      route.destChain === destChain &&
      route.assetIn === assetIn &&
      route.assetOut === assetOut &&
      route.envs.includes(env),
  );
}
