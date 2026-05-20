import BigNumber from 'bignumber.js';
import { Address, isAddress } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import {
  fromBaseDenomination,
  toBaseDenomination,
} from '../../../tokens/tokens';
import toBigInt from '../../../utils/numbers';
import {
  findStaticDepositAsset,
  LOMBARD_STRATEGY,
  LOMBARD_STRATEGY_DECIMALS,
} from '../config';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';

export interface PreviewStrategyDepositParameters extends IEnvParam {
  chainId: ChainId;
  rpcUrl?: string;
  strategy?: Address;
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
  chainId,
  rpcUrl,
  strategy,
  asset,
  amount: amountRaw,
  assetDecimals,
  env,
}: PreviewStrategyDepositParameters): Promise<BigNumber> {
  assertLombardStrategyChain(chainId);
  if (!isAddress(asset)) {
    throw new Error(`Invalid deposit asset address: ${asset}`);
  }
  const amount = BigNumber(amountRaw);
  if (!amount.isGreaterThan(0)) {
    throw new Error(
      `Preview amount must be greater than zero. Received: ${amount.toFixed()}.`,
    );
  }

  const address = resolveStrategyAddress(chainId, strategy);

  const decimals =
    assetDecimals ?? findStaticDepositAsset(chainId, asset)?.decimals;
  if (decimals === undefined) {
    throw new Error(
      `Could not resolve decimals for asset ${asset}. Pass \`assetDecimals\` explicitly.`,
    );
  }

  const amountBase = toBigInt(toBaseDenomination(amount, decimals));

  const client = makePublicClient({ chainId, rpcUrl, env });
  const sharesRaw = (await client.readContract({
    address,
    abi: LOMBARD_STRATEGY.abi,
    functionName: 'previewDeposit',
    args: [asset, amountBase],
  })) as bigint;

  return fromBaseDenomination(sharesRaw.toString(), LOMBARD_STRATEGY_DECIMALS);
}
