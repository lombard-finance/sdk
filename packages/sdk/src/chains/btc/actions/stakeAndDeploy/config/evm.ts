/**
 * EVM Chain Configuration for BTC StakeAndDeploy
 *
 * BTC StakeAndDeploy: BTC → LBTC → DeFi vault (Veda, Silo)
 *
 * Note: StakeAndDeploy is limited to chains that have both LBTC deployed
 * AND Veda/Silo vault support. This is a subset of all LBTC chains.
 *
 * @module chains/btc/actions/stakeAndDeploy/config/evm
 */

import type { EvmService } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';

import { getUserStakeAndBakeSignature } from '../../../../../api-functions/getUserStakeAndBakeSignature';
import type { ChainId } from '../../../../../common/chains';
import { AssetId, Chain, evmChainIdToChain } from '../../../../../core';
import { LombardError } from '../../../../../shared/errors';
import { ensureCorrectChain } from '../../../../../shared/evm/switchChain';
import { evmAddressSchema } from '../../../../../shared/validation';
import { EARN_STAKE_AND_BAKE_CHAINS } from '../../../../../vaults/lib/config';
import { getSupportedProtocols } from '../../depositAndDeploy/config';
import type { StakeAndDeployChainConfig } from './types';

// Convert chain IDs to Chain enum values (CAIP-2 format)
// Uses EARN_STAKE_AND_BAKE_CHAINS as source of truth
const STAKE_AND_DEPLOY_DEST_CHAINS = EARN_STAKE_AND_BAKE_CHAINS.map((chainId) =>
  evmChainIdToChain(chainId),
);

/**
 * EVM stake and deploy configuration
 *
 * StakeAndDeploy produces LBTC then deploys to a vault.
 * Limited to chains with Veda/Silo vault support.
 */
export const evmStakeAndDeployConfig: StakeAndDeployChainConfig = {
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

  // StakeAndDeploy requires vault support - uses EARN_STAKE_AND_BAKE_CHAINS as source of truth
  destChains: STAKE_AND_DEPLOY_DEST_CHAINS,

  // StakeAndDeploy produces LBTC (then deposits to vault)
  supportedAssetsOut: [AssetId.LBTC],

  supportedProtocols: getSupportedProtocols(AssetId.LBTC),

  addressSchema: evmAddressSchema,

  async getStakeAndBakeFee(ctx, chainId, protocol) {
    const evm = ctx.capabilities.require('evm') as EvmService;
    return evm.getStakeAndBakeFee(chainId as ChainId, protocol);
  },

  async authorizeStakeAndBake(
    ctx,
    { chainId, recipient, amount, vaultKey, token, expiry },
  ) {
    const evm = ctx.capabilities.require('evm') as EvmService;
    const provider = await ctx.getProvider('evm');
    if (!provider) {
      throw LombardError.providerMissing(String(chainId), 'evm');
    }

    // Ensure wallet is on the correct chain before signing
    await ensureCorrectChain(provider as EIP1193Provider, chainId as ChainId);

    const result = await evm.signStakeAndBake({
      value: amount,
      account: recipient,
      chainId: chainId as ChainId,
      provider: provider as EIP1193Provider,
      vaultKey,
      token,
      expiry,
    });

    // Store signature via API
    await ctx.api.storeStakeAndBakeSignature({
      signature: result.signature,
      typedData: result.typedData,
    });

    return {
      signature: result.signature,
      typedData: result.typedData,
    };
  },

  async restoreStakeAndBakeSignature(ctx, chainId, recipient) {
    try {
      const result = await getUserStakeAndBakeSignature({
        userDestinationAddress: recipient,
        chainId: chainId as ChainId,
        env: ctx.env,
      });

      // Check if signature exists by looking at metadata, not just the signature string.
      // The API may return metadata (expiration, amount, nonce) even if the raw
      // signature string is not included in the response.
      // If we have an expiration date, that means a valid signature exists on the server.
      const hasSignatureData = result.signature || result.expirationDate;
      if (!hasSignatureData) {
        return null;
      }

      // Check expiration - expirationDate is Unix timestamp in seconds
      // Convert to milliseconds for Date comparison
      if (result.expirationDate) {
        const expirationMs = Number(result.expirationDate) * 1000;
        if (expirationMs < Date.now()) {
          // Signature has expired
          return null;
        }
      }

      return {
        hasSignature: true,
        signature: result.signature,
        depositAmount: result.depositAmount,
        expirationDate: result.expirationDate,
      };
    } catch {
      // API error (e.g., signature not found, network error)
      // Return null to indicate no valid signature exists
      return null;
    }
  },
};
