/**
 * EVM Chain Configuration for Deposit
 *
 * Handles depositing wrapped BTC (WBTC, BTCb) to get LBTC.
 * Routes are derived from ASSET_CATALOG to ensure consistency.
 *
 * @module chains/evm/actions/deposit/config/evm
 */

import {
  AssetId,
  Chain,
  Env,
  getEvmAssetChains,
} from '../../../../../core';
import { evmAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Catalog-Derived Chain Lists
// ═══════════════════════════════════════════════════════════════════════════

/** 
 * Source chains: EVM chains with deposit assets (WBTC or BTCb) 
 * Note: We check for chains with any of the deposit assets
 */
const DEPOSIT_PROD_SOURCE_CHAINS = [
  ...new Set([
    ...getEvmAssetChains(AssetId.WBTC, [Env.prod]),
    ...getEvmAssetChains(AssetId.BTCb, [Env.prod]),
  ]),
];

const DEPOSIT_TESTNET_SOURCE_CHAINS = [
  ...new Set([
    ...getEvmAssetChains(AssetId.WBTC, [Env.testnet, Env.stage, Env.dev, Env.ibc]),
    ...getEvmAssetChains(AssetId.BTCb, [Env.testnet, Env.stage, Env.dev, Env.ibc]),
  ]),
];

/** Dest chains: EVM chains with LBTC deployed */
const LBTC_PROD_CHAINS = getEvmAssetChains(AssetId.LBTC, [Env.prod]);
const LBTC_TESTNET_CHAINS = getEvmAssetChains(AssetId.LBTC, [
  Env.testnet,
  Env.stage,
  Env.dev,
  Env.ibc,
]);

// ═══════════════════════════════════════════════════════════════════════════
// Configuration Objects
// ═══════════════════════════════════════════════════════════════════════════

/**
 * EVM deposit configuration
 *
 * Supports depositing WBTC/BTCb to get LBTC on EVM chains.
 * Source chains derived from WBTC/BTCb deployments.
 * Dest chains derived from LBTC deployments.
 */
export const evmConfig: ChainConfig = {
  chainType: 'evm',

  routes: [
    // Production: WBTC/BTCb → LBTC
    {
      assetsIn: [AssetId.WBTC, AssetId.BTCb],
      assetOut: AssetId.LBTC,
      sourceChains: DEPOSIT_PROD_SOURCE_CHAINS,
      destChains: LBTC_PROD_CHAINS,
      envs: [Env.prod],
    },
    // Testnet
    {
      assetsIn: [AssetId.WBTC, AssetId.BTCb],
      assetOut: AssetId.LBTC,
      sourceChains: DEPOSIT_TESTNET_SOURCE_CHAINS,
      destChains: LBTC_TESTNET_CHAINS,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc],
    },
  ],

  addressSchema: evmAddressSchema,
};

/**
 * Check if a deposit route is supported
 */
export function isDepositSupported(
  assetIn: AssetId,
  sourceChain: Chain,
  env: Env,
): boolean {
  return evmConfig.routes.some(
    route =>
      route.assetsIn.includes(assetIn) &&
      route.sourceChains.includes(sourceChain) &&
      route.envs.includes(env),
  );
}
