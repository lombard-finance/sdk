/**
 * Solana Stake Configuration
 *
 * Handles staking BTC.b to receive LBTC on Solana via Asset Router.
 *
 * @module chains/solana/actions/stake/config/solana
 */

import { Env } from '@lombard.finance/sdk-common';

import { AssetId, Chain } from '../../../../../core';
import { solanaAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

/**
 * BTC.b → LBTC stake configuration on Solana
 *
 * Converts BTC.b to LBTC via the Solana Asset Router program.
 */
export const solanaStakeConfig: ChainConfig = {
  chainType: 'solana',

  routes: [
    // Production: Solana Mainnet
    {
      sourceChains: [Chain.SOLANA_MAINNET],
      destChain: Chain.SOLANA_MAINNET,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      envs: [Env.prod],
    },
    // Testnet: Solana Devnet
    {
      sourceChains: [Chain.SOLANA_DEVNET],
      destChain: Chain.SOLANA_DEVNET,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc],
    },
  ],

  recipientSchema: solanaAddressSchema,
};

/**
 * Check if BTC.b → LBTC stake is supported on this Solana chain
 */
export function isStakeSupported(sourceChain: Chain, env: Env): boolean {
  return solanaStakeConfig.routes.some(
    route =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}
