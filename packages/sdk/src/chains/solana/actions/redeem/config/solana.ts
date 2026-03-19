/**
 * Solana Redeem Configuration
 *
 * Handles BTC.b → BTC redemption on Solana via Asset Router redeemForBtc.
 *
 * @module chains/solana/actions/redeem/config/solana
 */

import { Env } from '@lombard.finance/sdk-common';

import { AssetId, Chain } from '../../../../../core';
import { bitcoinAddressSchema } from '../../../../../shared/validation';
import type { ChainConfig } from './types';

export const solanaRedeemConfig: ChainConfig = {
  chainType: 'solana',

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

export function isRedeemSupported(
  sourceChain: Chain,
  destChain: Chain,
  assetIn: AssetId,
  assetOut: AssetId,
  env: Env,
): boolean {
  return solanaRedeemConfig.routes.some(
    route =>
      route.sourceChains.includes(sourceChain) &&
      route.destChain === destChain &&
      route.assetIn === assetIn &&
      route.assetOut === assetOut &&
      route.envs.includes(env),
  );
}
