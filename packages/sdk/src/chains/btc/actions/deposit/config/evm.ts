/**
 * EVM Chain Configuration for BTC Deposit
 *
 * BTC Deposit: BTC → BTC.b (wrapped BTC without yield)
 * For staking (BTC → LBTC), use BtcStake instead.
 *
 * Supported chains are derived from ASSET_CATALOG - single source of truth.
 *
 * Fee authorization is ONLY required for Ethereum mainnet.
 * Other chains use address confirmation signing.
 *
 * @module chains/btc/actions/deposit/config/evm
 */

import type { EvmService } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';

import type { ChainId } from '../../../../../common/chains';
import {
  AssetId,
  Chain,
  getAllAssetChains,
  isEvmChain,
} from '../../../../../core';
import { LombardError } from '../../../../../shared/errors';
import { ensureCorrectChain } from '../../../../../shared/evm/switchChain';
import { evmAddressSchema } from '../../../../../shared/validation';
import { Token } from '../../../../../tokens/token-addresses';
import { getTokenContractInfo } from '../../../../../tokens/tokens';
import { toSatoshi } from '../../../../../utils/satoshi';
import type { DepositChainConfig, DepositFeeAuthConfig } from './types';

/**
 * Chains that require fee authorization (unsubsidized chains).
 *
 * Ethereum mainnet and Sepolia require EIP-712 network fee signing.
 * Other chains are subsidized by Lombard.
 */
const UNSUBSIDIZED_CHAINS = [Chain.ETHEREUM, Chain.SEPOLIA] as const;

/**
 * Fee authorization config for unsubsidized chains
 *
 * BTC Deposit produces BTC.b, so we must use Token.BTCb for fee signatures.
 * This ensures the backend can distinguish between LBTC and BTC.b signatures.
 */
const feeAuthConfig: DepositFeeAuthConfig = {
  async getMintingFee(ctx, chainId) {
    const evm = ctx.capabilities.require('evm') as EvmService;
    // Fetch BTC.b minting fee (not LBTC!)
    return evm.getMintingFee(chainId as ChainId, Token.BTCb);
  },

  async restoreFeeSignature(ctx, chainId, address) {
    // Get BTC.b token address for this chain to distinguish from LBTC signatures
    const tokenInfo = await getTokenContractInfo(
      Token.BTCb,
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

    // Get BTC.b token info for this chain
    const tokenInfo = await getTokenContractInfo(
      Token.BTCb,
      chainId as ChainId,
      ctx.env,
    );

    // Sign the network fee with BTC.b token (not LBTC!)
    const result = await evm.signNetworkFee({
      fee: feeInSatoshis,
      account: recipient,
      chainId: chainId as ChainId,
      provider: provider as EIP1193Provider,
      token: Token.BTCb,
    });

    // Store the signature with token address to distinguish from LBTC signatures
    await ctx.api.storeFeeSignature({
      address: recipient,
      signature: result.signature,
      typedData: result.typedData,
      tokenAddress: tokenInfo.address,
    });

    return {
      signature: result.signature,
      typedData: result.typedData,
    };
  },
};

/**
 * EVM deposit configuration
 *
 * BTC Deposit produces BTC.b (wrapped BTC without yield).
 * Supported chains are derived from ASSET_CATALOG[AssetId.BTCb].deployments.
 */
export const evmDepositConfig: DepositChainConfig = {
  chainType: 'evm',

  routes: [
    {
      sourceChains: [Chain.BITCOIN_MAINNET],
      envs: [Env.prod],
    },
    {
      sourceChains: [Chain.BITCOIN_SIGNET],
      envs: [Env.stage, Env.dev, Env.testnet, Env.ibc],
    },
  ],

  // Derived from ASSET_CATALOG - all chains where BTC.b is deployed
  destChains: getAllAssetChains(AssetId.BTCb).filter((chain) =>
    isEvmChain(chain),
  ),

  // BTC Deposit only produces BTC.b
  supportedAssetsOut: [AssetId.BTCb],

  addressSchema: evmAddressSchema,

  /**
   * Get fee auth config - unsubsidized chains require fee authorization
   * Other chains use address confirmation signing
   */
  getFeeAuthConfig(destChain: Chain): DepositFeeAuthConfig | null {
    return (UNSUBSIDIZED_CHAINS as readonly Chain[]).includes(destChain)
      ? feeAuthConfig
      : null;
  },

  /**
   * Sign destination address confirmation
   * Used for non-fee-auth chains (e.g., Avalanche, Katana)
   */
  async signDestination(ctx, recipient, chainId) {
    const evm = ctx.capabilities.require('evm') as EvmService;
    const provider = await ctx.getProvider('evm');
    if (!provider) {
      throw LombardError.providerMissing(String(chainId), 'evm');
    }

    // Ensure wallet is on the correct chain before signing
    await ensureCorrectChain(provider as EIP1193Provider, chainId as ChainId);

    const result = await evm.signLbtcDestination({
      address: recipient,
      chainId: chainId as ChainId,
      provider: provider as EIP1193Provider,
    });

    return {
      signature: result.signature,
    };
  },
};
