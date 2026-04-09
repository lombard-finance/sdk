/**
 * Solana Chain Configuration
 *
 * Handles Solana destination chains (mainnet and devnet).
 * Uses Solana wallet signing via the Solana SDK module.
 *
 * BTC Stake: BTC → LBTC (yield-bearing staked BTC)
 * Supported chains derived from ASSET_CATALOG.
 *
 * @module chains/btc/actions/stake/config/solana
 */

import type { SolanaService } from "@lombard.finance/sdk-common";
import { Env } from "@lombard.finance/sdk-common";

import { AssetId, Chain, getAllAssetChains } from "../../../../../core";
import {
  LombardError,
  ValidationErrorCode,
} from "../../../../../shared/errors";
import { solanaAddressSchema } from "../../../../../shared/validation";
import { isSolanaChain } from "../../../../../utils/chain";
import type { ChainConfig } from "./types";

/**
 * Map CAIP-2 Solana chain identifier to SolanaNetwork format.
 *
 * The Solana SDK's signLbtcDestination expects network names like 'devnet', 'mainnet-beta',
 * but the SDK uses CAIP-2 chain identifiers with genesis hash references.
 *
 * @param chainId - CAIP-2 chain identifier (e.g., 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1')
 * @returns SolanaNetwork format (e.g., 'devnet')
 */
function chainToSolanaNetwork(chainId: string): string {
  // Map from CAIP-2 genesis hash references to SolanaNetwork names
  const CHAIN_TO_NETWORK: Record<string, string> = {
    // CAIP-2 format using genesis hash
    [Chain.SOLANA_MAINNET]: "mainnet-beta",
    [Chain.SOLANA_DEVNET]: "devnet",
    [Chain.SOLANA_TESTNET]: "testnet",
    // Legacy format (solana:network-name)
    "solana:mainnet-beta": "mainnet-beta",
    "solana:devnet": "devnet",
    "solana:testnet": "testnet",
  };

  const network = CHAIN_TO_NETWORK[chainId];
  if (!network) {
    throw new LombardError(
      ValidationErrorCode.INVALID_CHAIN,
      `Unknown Solana chain: ${chainId}. Expected one of: ${Object.keys(CHAIN_TO_NETWORK).join(", ")}`,
    );
  }
  return network;
}

/**
 * Solana chain configuration for BTC stake
 *
 * Supports staking BTC to LBTC on Solana.
 * Requires the @lombard.finance/sdk-solana module to be installed.
 */
export const solanaConfig: ChainConfig = {
  chainType: "solana",

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

  // Derived from ASSET_CATALOG - Solana chains where LBTC is deployed
  destChains: getAllAssetChains(AssetId.LBTC).filter((chain) =>
    isSolanaChain(chain),
  ),

  // BTC Stake only produces LBTC
  supportedAssetsOut: [AssetId.LBTC],

  addressSchema: solanaAddressSchema,

  // Solana never requires fee authorization
  getFeeAuthConfig: () => null,

  async getSignature(ctx, _recipient, chainId) {
    const solana = ctx.capabilities.require("solana") as SolanaService;
    // Convert CAIP-2 chain ID to SolanaNetwork format (e.g., 'devnet')
    const network = chainToSolanaNetwork(chainId as string);
    const { signature } = await solana.signLbtcDestination({
      network,
    });

    return { signature };
  },
};
