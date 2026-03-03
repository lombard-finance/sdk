/**
 * Solana Redeem Configuration
 *
 * Handles redeeming LBTC to receive BTC.b on Solana via Asset Router.
 *
 * @module chains/solana/actions/redeem/config/solana
 */

import { Env } from '@lombard.finance/sdk-common';

import { AssetId, Chain } from '../../../../../core';
import { solanaAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

/**
 * LBTC → BTC.b redeem configuration on Solana
 *
 * Converts LBTC to BTC.b via the Solana Asset Router program.
 */
export const solanaRedeemConfig: ChainConfig = {
  chainType: 'solana',

  routes: [
    // Production: Solana Mainnet
    {
      sourceChains: [Chain.SOLANA_MAINNET],
      destChain: Chain.SOLANA_MAINNET,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      envs: [Env.prod],
    },
    // Testnet: Solana Devnet
    {
      sourceChains: [Chain.SOLANA_DEVNET],
      destChain: Chain.SOLANA_DEVNET,
      assetIn: AssetId.LBTC,
      assetOut: AssetId.BTCb,
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc],
    },
  ],

  recipientSchema: solanaAddressSchema,
};

/**
 * Check if LBTC → BTC.b redeem is supported on this Solana chain
 */
export function isRedeemSupported(sourceChain: Chain, env: Env): boolean {
  return solanaRedeemConfig.routes.some(
    route =>
      route.sourceChains.includes(sourceChain) && route.envs.includes(env),
  );
}
