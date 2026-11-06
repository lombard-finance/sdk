/**
 * EVM Chain Configuration for BTC StakeAndDeploy
 *
 * BTC StakeAndDeploy: BTC → LBTC → DeFi vault (Bitcoin Earn, Silo)
 *
 * Note: StakeAndDeploy is limited to chains that have both LBTC deployed
 * AND Bitcoin Earn/Silo vault support. This is a subset of all LBTC chains.
 *
 * @module chains/btc/actions/deploy-lbtc/config/evm
 */

import type { EvmService } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import type { EIP1193Provider } from 'viem';

import { getUserStakeAndBakeSignature } from '../../../../../api-functions/getUserStakeAndBakeSignature';
import type { ChainId } from '../../../../../common/chains';
import {
  getPermitValue,
  getStakeAndBakeTokenAddress,
} from '../../../../../contract-functions/signStakeAndBake/utils';
import { getStakeAndBakeConfig } from '../../../../../contract-functions/signStakeAndBake/validation';
import { AssetId, Chain, evmChainIdToChain } from '../../../../../core';
import type {
  DefiProtocol,
  StakeAndBakeToken,
} from '../../../../../defi/defi-registry';
import { isLombardError, LombardError } from '../../../../../shared/errors';
import { ensureCorrectChain } from '../../../../../shared/evm/switchChain';
import { evmAddressSchema } from '../../../../../shared/validation';
import { EARN_STAKE_AND_BAKE_CHAINS } from '../../../../../vaults/lib/config';
import { getSupportedProtocols } from '../../deploy-btcb/config';
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
 * Limited to chains with Bitcoin Earn/Silo vault support.
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
    {
      chainId,
      recipient,
      amount,
      vaultKey,
      token,
      expiry,
      storeSignature = true,
    },
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

    if (storeSignature) {
      await ctx.api.storeStakeAndBakeSignature({
        signature: result.signature,
        typedData: result.typedData,
      });
    }

    return {
      signature: result.signature,
      typedData: result.typedData,
    };
  },

  async restoreStakeAndBakeSignature(ctx, chainId, recipient, required) {
    try {
      // The permit this deposit would be signed against, and the contract it
      // would let spend. The v2 route lists the permits for every token and
      // spender on the chain; one for another token belongs to another
      // product and says nothing about this deposit.
      const token = required.token as StakeAndBakeToken;
      const tokenAddress = getStakeAndBakeTokenAddress(
        token,
        chainId as ChainId,
        ctx.env,
      );
      const spenderAddress = getStakeAndBakeConfig(
        required.protocol as DefiProtocol,
        token,
        chainId as ChainId,
        ctx.env,
      ).spenderContract.address;

      const read = (spender?: string) =>
        getUserStakeAndBakeSignature({
          userDestinationAddress: recipient,
          chainId: chainId as ChainId,
          tokenAddress,
          ...(spender ? { spenderAddress: spender } : {}),
          env: ctx.env,
          auth: ctx.auth,
          getAuthToken: ctx.getAuthToken,
        });

      // Any live permit on this token first, whoever it lets spend. One for
      // another spender still has to stop the flow: a new permit is signed at
      // the token's next nonce, which an unused permit still holds, and the
      // v2 store replaces an unused permit that has the same nonce. Signing
      // here would overwrite another product's authorisation.
      let result = await read();
      if (!isLive(result)) {
        return null;
      }

      // The newest permit on the token is another spender's. This route's own
      // can still be on file at a lower nonce, and is the one to resume on.
      if (
        result.spenderAddress &&
        !sameAddress(result.spenderAddress, spenderAddress)
      ) {
        const own = await read(spenderAddress);
        if (isLive(own)) {
          result = own;
        }
      }

      return {
        hasSignature: true,
        signature: result.signature,
        depositAmount: result.depositAmount,
        expirationDate: result.expirationDate,
        // Only a record that names both can be shown to be this route's. The
        // v1 route names neither, so its record, which is whatever permit was
        // stored last for the wallet and chain, never is.
        matchesRoute:
          sameAddress(result.tokenAddress, tokenAddress) &&
          sameAddress(result.spenderAddress, spenderAddress),
        coversAmount: await storedAmountCovers(
          result.depositAmount,
          required,
          ctx.env,
        ),
      };
    } catch (error) {
      // A refusal the SDK raised itself, a ratio out of band or a refused
      // wallet token, is not "nothing on file": read that way, the action
      // would ask for a signature the store then refuses or uses to replace a
      // live permit.
      if (isLombardError(error)) {
        throw error;
      }
      // API error (e.g., signature not found, network error)
      // Return null to indicate no valid signature exists
      return null;
    }
  },
};

/**
 * Whether a record is a permit still on file. The API may return the metadata
 * (expiration, amount, nonce) without the signature string, so an expiry is
 * enough; an expiry in the past is not. `expirationDate` is in Unix seconds.
 */
function isLive(record: {
  signature?: string;
  expirationDate?: string;
}): boolean {
  if (!record.signature && !record.expirationDate) {
    return false;
  }
  return (
    !record.expirationDate || Number(record.expirationDate) * 1000 >= Date.now()
  );
}

/** Two addresses are the same when both are given and equal regardless of case. */
function sameAddress(a: string | undefined, b: string | undefined): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/**
 * Whether the amount on the stored signature covers the deposit being prepared.
 *
 * `deposit_amount` is the permit's own `value`: the store call sends only the
 * signature and the typed data, so the amount the server records is the one in
 * `message.value`. That is the ratio-converted figure, not the satoshis the
 * caller passed, so the new deposit is converted the same way before the two
 * are compared.
 *
 * A record with no amount on it cannot be shown to cover anything. It is
 * treated as not covering, which costs a signature prompt that may not have
 * been needed; the other way round skips the prompt for a deposit that is not
 * authorised.
 */
async function storedAmountCovers(
  depositAmount: string | undefined,
  required: { amount: string; token: string },
  env: Env,
): Promise<boolean> {
  const stored = new BigNumber(depositAmount ?? '');
  if (!stored.isFinite()) {
    return false;
  }

  const needed = await getPermitValue(
    required.token as StakeAndBakeToken,
    required.amount,
    env,
  );

  // Compared as the permit is built: the signer rounds the converted value down
  // to whole base units, so anything below that is what the stored figure has
  // to reach.
  return stored.isGreaterThanOrEqualTo(
    needed.decimalPlaces(0, BigNumber.ROUND_DOWN),
  );
}
