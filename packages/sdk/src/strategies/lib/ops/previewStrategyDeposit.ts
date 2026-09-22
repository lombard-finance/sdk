import BigNumber from 'bignumber.js';
import { Address, isAddress } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import {
  fromBaseDenomination,
  toBaseDenomination,
} from '../../../tokens/tokens';
import toBigInt from '../../../utils/numbers';
import { findStaticDepositAsset, resolveStrategy } from '../config';
import { StrategyBaseParameters } from '../params';

export interface PreviewStrategyDepositParameters extends StrategyBaseParameters {
  /** ERC-20 address of the deposit asset. */
  asset: Address;
  /**
   * Amount to deposit in human-readable units (e.g. "0.001").
   * Decimals are resolved from the static catalog; pass `assetDecimals`
   * explicitly to override.
   */
  amount: BigNumber.Value;
  /**
   * Asset decimals. Defaults to the static catalog entry's `decimals`.
   * Required when probing a token outside the catalog (e.g. a backend
   * preview against a newly added asset).
   */
  assetDecimals?: number;
}

/**
 * Returns the expected shares (in human-readable Strategy share units) that
 * a deposit of `amount` of `asset` would mint.
 *
 * Delegates to the Strategy's on-chain `previewDeposit(asset, assets)`,
 * which applies the per-asset deposit haircut. Throws on unsupported chains
 * or zero/negative amounts.
 */
export async function previewStrategyDeposit({
  rpcUrl,
  strategy,
  strategyId,
  asset,
  amount: amountRaw,
  assetDecimals,
  env,
  chainId: requestedChainId,
}: PreviewStrategyDepositParameters): Promise<BigNumber> {
  if (!isAddress(asset)) {
    throw new Error(`Invalid deposit asset address: ${asset}`);
  }
  const amount = BigNumber(amountRaw);
  if (!amount.isGreaterThan(0)) {
    throw new Error(
      `Preview amount must be greater than zero. Received: ${amount.toFixed()}.`,
    );
  }

  const {
    chainId,
    address,
    abi,
    decimals: shareDecimals,
    depositAssets,
  } = resolveStrategy({ env, strategyId, strategy, chainId: requestedChainId });

  const decimals =
    assetDecimals ?? findStaticDepositAsset(depositAssets, asset)?.decimals;
  if (decimals === undefined) {
    throw new Error(
      `Could not resolve decimals for asset ${asset}. Pass \`assetDecimals\` explicitly.`,
    );
  }

  const amountBase = toBigInt(toBaseDenomination(amount, decimals));

  const client = makePublicClient({ chainId, rpcUrl, env });
  const sharesRaw = (await client.readContract({
    address,
    abi,
    functionName: 'previewDeposit',
    args: [asset, amountBase],
  })) as bigint;

  return fromBaseDenomination(sharesRaw.toString(), shareDecimals);
}
