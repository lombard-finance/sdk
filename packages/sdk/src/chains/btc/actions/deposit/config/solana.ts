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
import { LombardError, ValidationErrorCode } from '../../../../../shared/errors';
import { solanaAddressSchema } from '../../../../../shared/validation';
import { isSolanaChain } from '../../../../../utils/chain';
import type { DepositChainConfig } from './types';

/**
 * Map CAIP-2 Solana chain identifier to SolanaNetwork format.
 *
 * The Solana SDK expects network names like 'devnet', 'mainnet-beta',
 * but the SDK uses CAIP-2 chain identifiers with genesis hash references.
 */
function chainToSolanaNetwork(chainId: string): string {
  const CHAIN_TO_NETWORK: Record<string, string> = {
    [Chain.SOLANA_MAINNET]: 'mainnet-beta',
    [Chain.SOLANA_DEVNET]: 'devnet',
    [Chain.SOLANA_TESTNET]: 'testnet',
    'solana:mainnet-beta': 'mainnet-beta',
    'solana:devnet': 'devnet',
    'solana:testnet': 'testnet',
  };

  const network = CHAIN_TO_NETWORK[chainId];
  if (!network) {
    throw new LombardError(
      ValidationErrorCode.INVALID_CHAIN,
      `Unknown Solana chain: ${chainId}. Expected one of: ${Object.keys(CHAIN_TO_NETWORK).join(', ')}`,
    );
  }
  return network;
}

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
      sourceChains: [Chain.BITCOIN_SIGNET],
      envs: [Env.stage, Env.dev],
    },
  ],

  destChains: getAllAssetChains(AssetId.BTCb).filter(chain =>
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
