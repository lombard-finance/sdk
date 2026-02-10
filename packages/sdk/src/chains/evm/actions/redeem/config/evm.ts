/**
 * EVM Chain Configuration for Redeem
 *
 * Handles redeeming BTC.b to native BTC (cross-chain).
 * This is the opposite operation to BTC Deposit.
 *
 * Future: Will also support L-Assets (L_ZEC, L_SOL, etc.) → native chains.
 *
 * @module chains/evm/actions/redeem/config/evm
 */

import { Env } from '@lombard.finance/sdk-common';

import {
  AssetId,
  Chain,
  getEvmAssetChains,
} from '../../../../../core';
import { bitcoinAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Catalog-Derived Chain Lists
// ═══════════════════════════════════════════════════════════════════════════

/** EVM chains with BTC.b deployed (can redeem to BTC) */
const BTCB_PROD_CHAINS = getEvmAssetChains(AssetId.BTCb, [Env.prod]);
const BTCB_TESTNET_CHAINS = getEvmAssetChains(AssetId.BTCb, [
  Env.testnet,
  Env.stage,
  Env.dev,
  Env.ibc,
]);

// ═══════════════════════════════════════════════════════════════════════════
// Configuration Objects
// ═══════════════════════════════════════════════════════════════════════════

/**
 * EVM redeem configuration
 *
 * Currently supports BTC.b → BTC (cross-chain to Bitcoin).
 * Source chains derived from BTC.b deployments in ASSET_CATALOG.
 */
export const evmConfig: ChainConfig = {
  chainType: 'evm',

  routes: [
    // BTC.b → BTC (to Bitcoin Mainnet)
    {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChains: BTCB_PROD_CHAINS,
      destChain: Chain.BITCOIN_MAINNET,
      envs: [Env.prod],
    },
    // BTC.b → BTC (to Bitcoin Signet - testnet)
    {
      assetIn: AssetId.BTCb,
      assetOut: AssetId.BTC,
      sourceChains: BTCB_TESTNET_CHAINS,
      destChain: Chain.BITCOIN_SIGNET,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc],
    },
    // TODO: Add L-Asset routes when deployed
    // L-ZEC → ZEC, L-SOL → SOL, L-XRP → XRP, L-DOGE → DOGE
  ],

  recipientSchema: bitcoinAddressSchema,
};

/**
 * Check if a redeem route is supported
 */
export function isRedeemSupported(
  assetIn: AssetId,
  sourceChain: Chain,
  env: Env,
): boolean {
  return evmConfig.routes.some(
    route =>
      route.assetIn === assetIn &&
      route.sourceChains.includes(sourceChain) &&
      route.envs.includes(env),
  );
}
