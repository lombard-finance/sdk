/**
 * EVM Chain Configuration for BTC DepositAndDeploy
 *
 * BTC DepositAndDeploy: BTC → BTC.b → DeFi vault (Silo)
 *
 * Note: DepositAndDeploy is for protocols that accept BTC.b (wrapped BTC)
 * rather than LBTC. Currently, this is Silo on Avalanche.
 *
 * @module chains/btc/actions/depositAndDeploy/config/evm
 */

import type { EvmService } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import type { EIP1193Provider } from 'viem';

import type { ChainId } from '../../../../../common/chains';
import { AssetId, Chain } from '../../../../../core';
import { LombardError } from '../../../../../shared/errors';
import { ensureCorrectChain } from '../../../../../shared/evm/switchChain';
import { evmAddressSchema } from '../../../../../shared/validation';
import { getSupportedProtocols } from '../../stakeAndDeploy/config';
import type { DepositAndDeployChainConfig } from './types';

// DepositAndDeploy requires BTC.b + Silo vault support
// Currently only Avalanche is supported
const DEPOSIT_AND_DEPLOY_CHAINS = {
  mainnet: [Chain.AVALANCHE],
  testnet: [Chain.AVALANCHE_FUJI],
};

/**
 * EVM deposit and deploy configuration
 *
 * DepositAndDeploy produces BTC.b then deploys to a vault.
 * Currently limited to Silo on Avalanche.
 */
export const evmDepositAndDeployConfig: DepositAndDeployChainConfig = {
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

  // DepositAndDeploy with BTC.b is available on Avalanche
  destChains: [
    ...DEPOSIT_AND_DEPLOY_CHAINS.mainnet,
    ...DEPOSIT_AND_DEPLOY_CHAINS.testnet,
  ],

  // DepositAndDeploy produces BTC.b (then deposits to vault)
  supportedAssetsOut: [AssetId.BTCb],

  supportedProtocols: getSupportedProtocols(AssetId.BTCb),

  addressSchema: evmAddressSchema,

  async getDepositAndDeployFee(ctx, chainId, vaultKey) {
    const evm = ctx.capabilities.require('evm') as EvmService;
    // Silo uses the same fee mechanism as stake and bake
    return evm.getStakeAndBakeFee(chainId as ChainId, vaultKey);
  },

  async authorizeDepositAndDeploy(
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

    // Silo uses the approve flow (on-chain approval), not permit
    const result = await evm.signStakeAndBake({
      value: amount,
      account: recipient,
      chainId: chainId as ChainId,
      provider: provider as EIP1193Provider,
      vaultKey,
      token,
      expiry,
    });

    // Store signature via API (even for approve flow, we need to track it)
    await ctx.api.storeStakeAndBakeSignature({
      signature: result.signature,
      typedData: result.typedData,
    });

    return {
      signature: result.signature,
      typedData: result.typedData,
      // approvalTxHash may not be present in the result for all flows
      approvalTxHash: (result as { approvalTxHash?: string }).approvalTxHash,
    };
  },
};
