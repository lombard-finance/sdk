/**
 * EVM Chain Configuration for Unstake
 *
 * Handles unstaking LBTC to BTC (cross-chain) or BTC.b (same-chain).
 * Routes are derived from ASSET_CATALOG to ensure consistency.
 *
 * @module chains/evm/actions/unstake/config/evm
 */

import { Env } from "@lombard.finance/sdk-common";

import {
  AssetId,
  Chain,
  getEvmAssetChains,
  getEvmChainsWithAllAssets,
} from "../../../../../core";
import {
  bitcoinAddressSchema,
  evmAddressSchema,
} from "../../../../../shared/validation";
import type { ChainConfig } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// Catalog-Derived Chain Lists
// ═══════════════════════════════════════════════════════════════════════════

/** EVM chains with LBTC deployed (can unstake to BTC) */
const LBTC_PROD_CHAINS = getEvmAssetChains(AssetId.LBTC, [Env.prod]);
const LBTC_TESTNET_CHAINS = getEvmAssetChains(AssetId.LBTC, [
  Env.testnet,
  Env.stage,
  Env.dev,
  Env.ibc,
]);

/** EVM chains with BOTH LBTC and BTCb deployed (can unstake to BTCb) */
const LBTC_BTCB_PROD_CHAINS = getEvmChainsWithAllAssets(
  [AssetId.LBTC, AssetId.BTCb],
  [Env.prod],
);
const LBTC_BTCB_TESTNET_CHAINS = getEvmChainsWithAllAssets(
  [AssetId.LBTC, AssetId.BTCb],
  [Env.testnet, Env.stage, Env.dev, Env.ibc],
);

// ═══════════════════════════════════════════════════════════════════════════
// Configuration Objects
// ═══════════════════════════════════════════════════════════════════════════

/**
 * EVM → BTC configuration (cross-chain unstake)
 *
 * Burns LBTC on EVM, releases BTC on Bitcoin network.
 * Source chains derived from ASSET_CATALOG LBTC deployments.
 */
export const evmToBtcConfig: ChainConfig = {
  chainType: "evm",

  routes: [
    // Production: EVM chains with LBTC → Bitcoin Mainnet
    {
      sourceChains: LBTC_PROD_CHAINS,
      destChain: Chain.BITCOIN_MAINNET,
      envs: [Env.prod],
    },
    // Testnet: EVM chains with LBTC → Bitcoin Signet
    {
      sourceChains: LBTC_TESTNET_CHAINS,
      destChain: Chain.BITCOIN_SIGNET,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc],
    },
  ],

  recipientSchema: bitcoinAddressSchema,
};

/**
 * EVM → BTC.b configuration (same-chain wrapped)
 *
 * Burns LBTC on EVM, mints BTC.b on same EVM chain.
 * Only available on chains with BOTH LBTC and BTCb deployed.
 * Routes are generated dynamically from catalog.
 */
export const evmToBtcbConfig: ChainConfig = {
  chainType: "evm",

  routes: [
    // Production: Same-chain routes for chains with both LBTC and BTCb
    ...LBTC_BTCB_PROD_CHAINS.map((chain) => ({
      sourceChains: [chain],
      destChain: chain,
      envs: [Env.prod] as Env[],
    })),
    // Testnet: Same-chain routes
    ...LBTC_BTCB_TESTNET_CHAINS.map((chain) => ({
      sourceChains: [chain],
      destChain: chain,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc] as Env[],
    })),
  ],

  recipientSchema: evmAddressSchema,
};

/**
 * Check if unstake to BTC is supported
 */
export function isBtcUnstakeSupported(sourceChain: Chain, env: Env): boolean {
  return evmToBtcConfig.routes.some(
    (route) =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}

/**
 * Check if unstake to BTC.b is supported
 */
export function isBtcbUnstakeSupported(sourceChain: Chain, env: Env): boolean {
  return evmToBtcbConfig.routes.some(
    (route) =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}
