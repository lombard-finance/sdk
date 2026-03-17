/**
 * Solana Stake Configuration
 *
 * Handles staking BTC.b on Solana → LBTC on Solana via Asset Router + GMP.
 *
 * @module chains/solana/actions/stake/config/solana
 */

import { Env } from '@lombard.finance/sdk-common';

import { AssetId, Chain } from '../../../../../core';
import { solanaAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

export const solanaStakeConfig: ChainConfig = {
  chainType: 'solana',

  routes: [
    {
      sourceChains: [Chain.SOLANA_DEVNET],
      destChain: Chain.SOLANA_DEVNET,
      assetIn: AssetId.BTCb,
      assetOut: AssetId.LBTC,
      envs: [Env.stage, Env.dev],
    },
  ],

  recipientSchema: solanaAddressSchema,
};

export function isStakeSupported(
  sourceChain: Chain,
  destChain: Chain,
  assetIn: AssetId,
  assetOut: AssetId,
  env: Env,
): boolean {
  return solanaStakeConfig.routes.some(
    route =>
      route.sourceChains.includes(sourceChain) &&
      route.destChain === destChain &&
      route.assetIn === assetIn &&
      route.assetOut === assetOut &&
      route.envs.includes(env),
  );
}
