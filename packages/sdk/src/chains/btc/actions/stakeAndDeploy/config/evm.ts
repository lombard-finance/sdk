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
import BigNumber from 'bignumber.js';
import type { EIP1193Provider } from 'viem';

import {
  getUserStakeAndBakeSignature,
  type IGetUserStakeAndBakeSignatureResponse,
} from '../../../../../api-functions/getUserStakeAndBakeSignature';
import {
  getStakeAndBakePermits,
  type StakeAndBakePermit,
} from '../../../../../api-functions/stakeAndBakePermits/getStakeAndBakePermits';
import type { ChainId } from '../../../../../common/chains';
import { getPermitNonce } from '../../../../../contract-functions/getPermitNonce/getPermitNonce';
import {
  getPermitValue,
  getStakeAndBakeTokenContract,
} from '../../../../../contract-functions/signStakeAndBake/utils';
import { getStakeAndBakeConfig } from '../../../../../contract-functions/signStakeAndBake/validation';
import { AssetId, Chain, evmChainIdToChain } from '../../../../../core';
import {
  type DefiProtocol,
  getStakeAndBakeStakedToken,
  type StakeAndBakeStrategy,
  type StakeAndBakeToken,
} from '../../../../../defi/defi-registry';
import { LombardError } from '../../../../../shared/errors';
import { ensureCorrectChain } from '../../../../../shared/evm/switchChain';
import { evmAddressSchema } from '../../../../../shared/validation';
import { UnauthorizedWalletJwtError } from '../../../../../utils/err';
import { EARN_STAKE_AND_BAKE_CHAINS } from '../../../../../vaults/lib/config';
import { getSupportedProtocols } from '../../depositAndDeploy/config';
import type {
  StakeAndBakeRestoreResult,
  StakeAndDeployChainConfig,
} from './types';

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
    const strategy = resolveStrategy(required, chainId as ChainId, ctx.env);

    if (strategy && required.walletJwt) {
      return restoreFromPermits(
        strategy,
        recipient,
        required,
        required.walletJwt,
        ctx.env,
      );
    }

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

      if (
        strategy &&
        (await isConsumedForStakedToken(strategy, recipient, result, ctx.env))
      ) {
        // Not a pending permit on this strategy's token.
        return null;
      }

      return {
        hasSignature: true,
        signature: result.signature,
        depositAmount: result.depositAmount,
        expirationDate: result.expirationDate,
        coversAmount: await storedAmountCovers(
          result.depositAmount,
          required,
          ctx.env,
        ),
      };
    } catch {
      // API error (e.g., signature not found, network error)
      // Return null to indicate no valid signature exists
      return null;
    }
  },
};

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

function resolveStrategy(
  required: { token: string; protocol?: string },
  chainId: ChainId,
  env: Env,
): StakeAndBakeStrategy | undefined {
  if (!required.protocol) return undefined;
  try {
    return getStakeAndBakeConfig(
      required.protocol as DefiProtocol,
      required.token as StakeAndBakeToken,
      chainId,
      env,
    );
  } catch {
    return undefined;
  }
}

/**
 * The v1 route answers with the most recent permit for the recipient and
 * chain, whatever its spender or token. Its record carries no token, so the
 * one check available is the nonce: an unused permit on this strategy's token
 * cannot sit below that token's on-chain `nonces(owner)`. A record that does
 * is either spent or for another token, and is not a resume here.
 *
 * Inconclusive (no nonce on the record, or the read failed) counts as not
 * consumed, which keeps the previous behaviour.
 */
async function isConsumedForStakedToken(
  strategy: StakeAndBakeStrategy,
  recipient: string,
  record: IGetUserStakeAndBakeSignatureResponse,
  env: Env,
): Promise<boolean> {
  if (strategy.approval.nonceStrategy !== 'chain') return false;
  if (record.nonce === undefined || record.nonce === null) return false;
  if (!/^\d+$/.test(String(record.nonce))) return false;

  try {
    const onChain = await getPermitNonce({
      owner: recipient as `0x${string}`,
      token: getStakeAndBakeStakedToken(strategy),
      chainId: strategy.chainId,
      env,
    });
    return BigInt(record.nonce) < BigInt(onChain);
  } catch {
    return false;
  }
}

/**
 * Restores from the v2 permit route: only unexpired, unblocked permits for
 * this strategy's spender and staked token count. Among them the lowest nonce
 * that covers the deposit is reported, or the lowest nonce when none does.
 *
 * The v2 route returns no signature bytes. They are taken from the v1 record
 * when it is the same permit (same nonce, amount and deadline); otherwise the
 * result carries none, which `prepare()` treats as a record it cannot go
 * ready on.
 *
 * A rejected JWT is raised rather than read as "nothing on file": the caller
 * passed it to get a filtered answer, and an unfiltered guess is what it
 * replaces.
 */
async function restoreFromPermits(
  strategy: StakeAndBakeStrategy,
  recipient: string,
  required: { amount: string; token: string },
  walletJwt: string,
  env: Env,
): Promise<StakeAndBakeRestoreResult | null> {
  let permits: StakeAndBakePermit[];
  let tokenAddress: string;
  try {
    const stakedToken = getStakeAndBakeStakedToken(strategy);
    const [tokenContract, listed] = await Promise.all([
      getStakeAndBakeTokenContract(stakedToken, strategy.chainId, env),
      getStakeAndBakePermits({
        address: recipient,
        chainId: strategy.chainId,
        walletJwt,
        env,
      }),
    ]);
    tokenAddress = String(tokenContract.address).toLowerCase();
    permits = listed.permits;
  } catch (error) {
    if (error instanceof UnauthorizedWalletJwtError) throw error;
    return null;
  }

  const spender = strategy.spenderContract.address.toLowerCase();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const candidates = permits
    .filter(
      (permit) =>
        permit.spenderAddress.toLowerCase() === spender &&
        permit.tokenAddress.toLowerCase() === tokenAddress &&
        !permit.expired &&
        !permit.blocked &&
        permit.expiresAt > nowSeconds,
    )
    .sort((a, b) => {
      const diff = BigInt(a.nonce) - BigInt(b.nonce);
      return diff < 0n ? -1 : diff > 0n ? 1 : 0;
    });

  if (candidates.length === 0) return null;

  const covering: Array<[StakeAndBakePermit, boolean]> = await Promise.all(
    candidates.map(
      async (permit): Promise<[StakeAndBakePermit, boolean]> => [
        permit,
        await storedAmountCovers(permit.depositAmount, required, env),
      ],
    ),
  );
  const [chosen, coversAmount] =
    covering.find(([, covers]) => covers) ?? covering[0];

  return {
    hasSignature: true,
    signature: await signatureFromV1(chosen, recipient, strategy, env),
    depositAmount: chosen.depositAmount,
    expirationDate: String(chosen.expiresAt),
    coversAmount,
  };
}

async function signatureFromV1(
  permit: StakeAndBakePermit,
  recipient: string,
  strategy: StakeAndBakeStrategy,
  env: Env,
): Promise<string | undefined> {
  try {
    const record = await getUserStakeAndBakeSignature({
      userDestinationAddress: recipient,
      chainId: strategy.chainId,
      env,
    });
    const same =
      record.signature &&
      record.nonce !== undefined &&
      String(record.nonce) === permit.nonce &&
      new BigNumber(record.depositAmount).isEqualTo(permit.depositAmount) &&
      Number(record.expirationDate) === permit.expiresAt;
    return same ? record.signature : undefined;
  } catch {
    return undefined;
  }
}
