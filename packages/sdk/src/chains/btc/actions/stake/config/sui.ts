/**
 * Sui Chain Configuration
 *
 * Handles Sui destination chains (mainnet and testnet).
 * Uses Sui wallet signing via the Sui SDK module.
 *
 * BTC Stake: BTC → LBTC (yield-bearing staked BTC)
 * Supported chains derived from ASSET_CATALOG.
 *
 * @module chains/btc/actions/stake/config/sui
 */

import type { SuiService } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';

import { AssetId, Chain, getAllAssetChains } from '../../../../../core';
import { suiAddressSchema } from '../../../../../shared/validation';
import { isSuiChain } from '../../../../../utils/chain';
import type { ChainConfig } from './types';

/**
 * Sui chain configuration for BTC stake
 *
 * Supports staking BTC to LBTC on Sui.
 * Requires the @lombard.finance/sdk-sui module to be installed.
 */
export const suiConfig: ChainConfig = {
  chainType: 'sui',

  routes: [
    {
      sourceChains: [Chain.BITCOIN_MAINNET],
      envs: [Env.prod],
    },
    {
      sourceChains: [Chain.BITCOIN_SIGNET],
      envs: [Env.testnet, Env.stage, Env.dev, Env.ibc],
    },
  ],

  // Derived from ASSET_CATALOG - Sui chains where LBTC is deployed
  destChains: getAllAssetChains(AssetId.LBTC).filter(chain =>
    isSuiChain(chain),
  ),

  // BTC Stake only produces LBTC
  supportedAssetsOut: [AssetId.LBTC],

  addressSchema: suiAddressSchema,

  // Sui never requires fee authorization
  getFeeAuthConfig: () => null,

  async getSignature(ctx, _recipient, chainId) {
    const sui = ctx.capabilities.require('sui') as SuiService;
    const { signature } = await sui.signLbtcDestination({
      chainId: chainId as string,
    });

    return { signature };
  },
};
