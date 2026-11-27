/**
 * Starknet Chain Configuration
 *
 * Handles Starknet destination chains (mainnet and Sepolia).
 * Uses Starknet wallet signing via the Starknet SDK module.
 * Note: Starknet requires address padding and returns a public key.
 *
 * BTC Stake: BTC → LBTC (yield-bearing staked BTC)
 * Supported chains derived from ASSET_CATALOG.
 *
 * @module chains/btc/actions/stake/config/starknet
 */

import type { StarknetService } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { pad } from 'viem';

import { AssetId, Chain, getAllAssetChains } from '../../../../../core';
import { starknetAddressSchema } from '../../../../../shared/validation';
import { isStarknetChain } from '../../../../../utils/chain';
import type { ChainConfig } from './types';

/**
 * Starknet chain configuration for BTC stake
 *
 * Supports staking BTC to LBTC on Starknet.
 * Requires the @lombard.finance/sdk-starknet module to be installed.
 */
export const starknetConfig: ChainConfig = {
  chainType: 'starknet',

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

  // Derived from ASSET_CATALOG - Starknet chains where LBTC is deployed
  destChains: getAllAssetChains(AssetId.LBTC).filter((chain) =>
    isStarknetChain(chain),
  ),

  // BTC Stake only produces LBTC
  supportedAssetsOut: [AssetId.LBTC],

  addressSchema: starknetAddressSchema,

  // Starknet never requires fee authorization
  getFeeAuthConfig: () => null,

  async getSignature(ctx, recipient, chainId) {
    const starknet = ctx.capabilities.require('starknet') as StarknetService;
    const { signature, pubKey } = await starknet.signLbtcDestination({
      chainId: chainId as string,
    });

    // Starknet addresses need to be padded to 32 bytes
    const paddedAddress = pad(recipient as `0x${string}`, { size: 32 });

    return { signature, pubKey, paddedAddress };
  },
};
