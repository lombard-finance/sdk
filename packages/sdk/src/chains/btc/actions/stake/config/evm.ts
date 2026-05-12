/**
 * EVM Chain Configuration
 *
 * Handles all EVM-compatible destination chains (Ethereum, Base, Arbitrum, etc.)
 * Includes fee authorization for Ethereum mainnet and destination signing for others.
 *
 * Supported chains are derived from ASSET_CATALOG - single source of truth.
 *
 * @module chains/btc/actions/stake/config/evm
 */

import type { EvmService } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';

import { FeeSignatureAlreadyExistsError } from '../../../../../api-functions/storeNetworkFeeSignature/storeNetworkFeeSignature';
import type { ChainId } from '../../../../../common/chains';
import { AssetId, Chain, getAllAssetChains } from '../../../../../core';
import { LombardError } from '../../../../../shared/errors';
import { ensureCorrectChain } from '../../../../../shared/evm/switchChain';
import { evmAddressSchema } from '../../../../../shared/validation';
import { Token } from '../../../../../tokens/token-addresses';
import { getTokenContractInfo } from '../../../../../tokens/tokens';
import { isEvmChain } from '../../../../../utils/chain';
import { toSatoshi } from '../../../../../utils/satoshi';
import type { ChainConfig, FeeAuthConfig } from './types';

/**
 * Chains that require fee authorization (unsubsidized chains).
 *
 * These chains require users to sign a fee authorization message
 * before minting LBTC. On subsidized chains, Lombard covers the fees.
 */
const UNSUBSIDIZED_CHAINS = [Chain.ETHEREUM, Chain.SEPOLIA] as const;

/**
 * Fee authorization config for unsubsidized chains.
 *
 * Ethereum mainnet and Sepolia require fee authorization.
 * All methods access EvmService via capabilities.
 *
 * BTC Stake produces LBTC, so we use Token.LBTC for fee signatures.
 * This ensures the backend can distinguish between LBTC and BTC.b signatures.
 */
const feeAuthConfig: FeeAuthConfig = {
  async getMintingFee(ctx, chainId) {
    const evm = ctx.capabilities.require('evm') as EvmService;
    return evm.getMintingFee(chainId as ChainId);
  },

  async restoreFeeSignature(ctx, chainId, address) {
    // Get LBTC token address for this chain to distinguish from BTC.b signatures
    const tokenInfo = await getTokenContractInfo(
      Token.LBTC,
      chainId as ChainId,
      ctx.env,
    );

    const result = await ctx.api.getFeeSignature({
      address,
      chainId: chainId as ChainId,
      tokenAddress: tokenInfo.address,
    });

    // Check if signature exists on server (API returns has_signature flag)
    if (!result.hasSignature) {
      return null;
    }

    // Check expiration - expirationDate is Unix timestamp in seconds
    // Convert to milliseconds for Date comparison
    if (
      result.expirationDate &&
      new Date(Number(result.expirationDate) * 1000) < new Date()
    ) {
      return null;
    }

    // Return hasSignature: true even if actual signature string is not returned by API
    // The server has the signature stored; we just need to know it's valid
    return {
      hasSignature: true,
      signature: result.signature, // May be undefined - that's OK
      typedData: result.typedData,
    };
  },

  async authorizeFee(ctx, { chainId, recipient, fee }) {
    const evm = ctx.capabilities.require('evm') as EvmService;
    const provider = await ctx.getProvider('evm');
    if (!provider) {
      throw LombardError.providerMissing(String(chainId), 'evm');
    }

    // Ensure wallet is on the correct chain before signing
    await ensureCorrectChain(provider as EIP1193Provider, chainId as ChainId);

    // getMintingFee returns BTC (e.g., "0.00000032"), but signNetworkFee expects satoshis
    const feeInSatoshis = toSatoshi(fee).toString();

    // Get LBTC token info for this chain
    const tokenInfo = await getTokenContractInfo(
      Token.LBTC,
      chainId as ChainId,
      ctx.env,
    );

    // Sign the network fee with LBTC token (explicitly specified)
    const result = await evm.signNetworkFee({
      fee: feeInSatoshis,
      account: recipient,
      chainId: chainId as ChainId,
      provider: provider as EIP1193Provider,
      token: Token.LBTC,
    });

    // Store the signature with token address to distinguish from BTC.b signatures.
    // If the BFF reports a signature already exists (code 6), fall back to the
    // one it already has. This recovers from cases where restoreFeeSignature
    // missed the existing record (race, token-address mismatch, etc.) — the
    // user's wallet signature is consumed but the workflow continues with the
    // server-known signature instead of surfacing a confusing "already exists"
    // error to the end user.
    try {
      await ctx.api.storeFeeSignature({
        address: recipient,
        signature: result.signature,
        typedData: result.typedData,
        tokenAddress: tokenInfo.address,
      });
    } catch (err) {
      if (!(err instanceof FeeSignatureAlreadyExistsError)) throw err;
      const stored = await ctx.api.getFeeSignature({
        address: recipient,
        chainId: chainId as ChainId,
        tokenAddress: tokenInfo.address,
      });
      if (stored?.hasSignature) {
        return {
          signature: stored.signature ?? result.signature,
          typedData: stored.typedData ?? result.typedData,
        };
      }
      // BFF says one exists but won't return it. Surface a clearer message.
      throw new Error(
        'A fee authorization signature already exists for this account but cannot be retrieved. Refresh the page and try again, or contact support if this persists.',
      );
    }

    return {
      signature: result.signature,
      typedData: result.typedData,
    };
  },
};

/**
 * EVM chain configuration for BTC stake
 *
 * BTC Stake: BTC → LBTC (yield-bearing staked BTC)
 * Supports staking BTC to LBTC on any EVM-compatible chain.
 * Supported chains are derived from ASSET_CATALOG[AssetId.LBTC].deployments.
 */
export const evmConfig: ChainConfig = {
  chainType: 'evm',

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

  // Derived from ASSET_CATALOG - all EVM chains where LBTC is deployed
  // Note: This includes all chains across all environments
  // The `routes` config above filters by source chain + env
  destChains: getAllAssetChains(AssetId.LBTC).filter((chain) => {
    return isEvmChain(chain);
  }),

  // BTC Stake only produces LBTC
  supportedAssetsOut: [AssetId.LBTC],

  addressSchema: evmAddressSchema,

  getFeeAuthConfig(destChain) {
    // Unsubsidized chains require fee authorization
    return (UNSUBSIDIZED_CHAINS as readonly Chain[]).includes(destChain)
      ? feeAuthConfig
      : null;
  },

  async getSignature(ctx, recipient, chainId) {
    const evm = ctx.capabilities.require('evm') as EvmService;
    const provider = await ctx.getProvider('evm');
    if (!provider) {
      throw LombardError.providerMissing(String(chainId), 'evm');
    }

    // Ensure wallet is on the correct chain before signing
    await ensureCorrectChain(provider as EIP1193Provider, chainId as ChainId);

    return evm.signLbtcDestination({
      chainId: chainId as ChainId,
      address: recipient,
      provider: provider as EIP1193Provider,
    });
  },
};
