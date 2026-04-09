/**
 * BTC Destination Configuration for Solana Unstake
 *
 * Handles unstaking LBTC from Solana to BTC on Bitcoin.
 *
 * @module chains/solana/actions/unstake/config/btc
 */

import { Env } from "@lombard.finance/sdk-common";

import { Chain } from "../../../../../core";
import { bitcoinAddressSchema } from "../../../../../shared/validation";
import type { ChainConfig } from "./types";

/**
 * Solana → BTC configuration
 *
 * Burns LBTC on Solana, releases BTC on Bitcoin network.
 */
export const solanaToBtcConfig: ChainConfig = {
  chainType: "solana",

  routes: [
    // Production: Solana Mainnet → Bitcoin Mainnet
    {
      sourceChains: [Chain.SOLANA_MAINNET],
      destChain: Chain.BITCOIN_MAINNET,
      envs: [Env.prod],
    },
    // Testnet: Solana Devnet → Bitcoin Signet
    {
      sourceChains: [Chain.SOLANA_DEVNET],
      destChain: Chain.BITCOIN_SIGNET,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc],
    },
  ],

  recipientSchema: bitcoinAddressSchema,
};

/**
 * Check if unstake to BTC is supported from this Solana chain
 */
export function isBtcUnstakeSupported(sourceChain: Chain, env: Env): boolean {
  return solanaToBtcConfig.routes.some(
    (route) =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}
