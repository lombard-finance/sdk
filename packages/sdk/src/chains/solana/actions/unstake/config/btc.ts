/**
 * Solana Unstake Configuration
 *
 * Handles unstaking LBTC on Solana to BTC (cross-chain) or BTC.b (same-chain).
 *
 * @module chains/solana/actions/unstake/config/btc
 */

import { Env } from '@lombard.finance/sdk-common';

import { AssetId, Chain } from '../../../../../core';
import {
  bitcoinAddressSchema,
  solanaAddressSchema,
} from '../../../../../shared/validation';
import type { ChainConfig } from './types';

/**
 * LBTC → BTC configuration (cross-chain)
 *
 * Burns LBTC via LBTC program, releases BTC on Bitcoin.
 */
export const solanaToBtcConfig: ChainConfig = {
  chainType: 'solana',

  routes: [
    {
      sourceChains: [Chain.SOLANA_MAINNET],
      destChain: Chain.BITCOIN_MAINNET,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
      envs: [Env.prod],
    },
    {
      sourceChains: [Chain.SOLANA_DEVNET],
      destChain: Chain.BITCOIN_SIGNET,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTC,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc],
    },
  ],

  recipientSchema: bitcoinAddressSchema,
};

/**
 * LBTC → BTC.b configuration (same-chain)
 *
 * Burns LBTC via Asset Router, routes BTC.b to the recipient on Solana.
 */
export const solanaToBtcbConfig: ChainConfig = {
  chainType: 'solana',

  routes: [
    {
      sourceChains: [Chain.SOLANA_DEVNET],
      destChain: Chain.SOLANA_DEVNET,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      envs: [Env.stage, Env.dev, Env.testnet],
    },
  ],

  recipientSchema: solanaAddressSchema,
};

const allRoutes = [...solanaToBtcConfig.routes, ...solanaToBtcbConfig.routes];

/**
 * Check if unstake is supported for the given route
 */
export function isUnstakeSupported(
  sourceChain: Chain,
  assetIn: AssetId,
  assetOut: AssetId,
  env: Env,
): boolean {
  return allRoutes.some(
    route =>
      route.sourceChains.includes(sourceChain) &&
      route.assetIn === assetIn &&
      route.assetOut === assetOut &&
      route.envs.includes(env),
  );
}
