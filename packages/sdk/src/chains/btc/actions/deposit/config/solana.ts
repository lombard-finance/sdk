/**
 * Solana Chain Configuration for BTC Deposit
 *
 * BTC Deposit: BTC → BTC.b (wrapped BTC without yield)
 * Handles Solana destination chains (mainnet, testnet, devnet).
 * Uses Solana wallet signing via the Solana SDK module.
 *
 * Supported chains derived from ASSET_CATALOG.
 *
 * @module chains/btc/actions/deposit/config/solana
 */

import type { SolanaService } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';

import { AssetId, Chain, getAllAssetChains } from '../../../../../core';
import { solanaAddressSchema } from '../../../../../shared/validation';
import {
  chainToSolanaNetwork,
  isSolanaChain,
} from '../../../../../utils/chain';
import type { DepositChainConfig } from './types';

/**
 * Solana chain configuration for BTC deposit
 *
 * Supports depositing BTC to receive BTC.b on Solana.
 * Requires the @lombard.finance/sdk-solana module to be installed.
 */
export const solanaDepositConfig: DepositChainConfig = {
  chainType: 'solana',

  routes: [
    {
      sourceChains: [Chain.BITCOIN_MAINNET],
      envs: [Env.prod],
    },
    {
      sourceChains: [Chain.BITCOIN_SIGNET],
      envs: [Env.stage, Env.dev, Env.testnet],
    },
  ],

  destChains: getAllAssetChains(AssetId.BTCb).filter((chain) =>
    isSolanaChain(chain),
  ),

  supportedAssetsOut: [AssetId.BTCb],

  addressSchema: solanaAddressSchema,

  getFeeAuthConfig: () => null,

  async signDestination(ctx, _recipient, chainId) {
    const solana = ctx.capabilities.require('solana') as SolanaService;
    const network = chainToSolanaNetwork(chainId as string);
    const { signature } = await solana.signLbtcDestination({
      network,
    });

    return { signature };
  },
};
