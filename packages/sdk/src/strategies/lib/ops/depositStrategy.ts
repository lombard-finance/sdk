import BigNumber from 'bignumber.js';
import { Address, erc20Abi, Hash, isAddress } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { makeWalletClient } from '../../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../../common/chains';
import { toBaseDenomination } from '../../../tokens/tokens';
import { getErrorMessage } from '../../../utils/err';
import toBigInt from '../../../utils/numbers';
import { findStaticDepositAsset, resolveStrategy } from '../config';
import { StrategyWriteParameters } from '../params';

export type DepositStrategyParameters = {
  /** ERC-20 deposit asset address (must be `isDepositAsset` on the Strategy). */
  asset: Address;
  /** Amount to deposit in human-readable units (e.g. "0.001"). */
  amount: BigNumber.Value;
  /**
   * Decimals of the deposit asset. Defaults to the static catalog entry
   * for this chain + asset; required when depositing an asset outside the
   * catalog (e.g. one added by the curator after the SDK was published).
   */
  assetDecimals?: number;
  /** Receiver of the Strategy shares. Defaults to `account`. */
  receiver?: Address;
  /**
   * Minimum shares to mint, slippage protection. Specified in Strategy
   * share base units (1e8 for BTCoc). Default `0n` is parity
   * with the 3-arg `deposit` overload.
   */
  minSharesOut?: bigint;
  /**
   * Whether to send an approval transaction when allowance is insufficient.
   * If `false` and allowance is insufficient, throws instead of approving.
   * @default true
   */
  approve?: boolean;
} & StrategyWriteParameters;

/**
 * Deposits a supported ERC-20 asset into the Lombard DeFi Vault Strategy.
 *
 * Uses the 4-arg `deposit(asset, amount, receiver, minSharesOut)` overload
 * with `minSharesOut` defaulting to `0n` (matching the behavior of the
 * 3-arg overload). The Strategy is the `transferFrom` target, so the
 * approval target is the Strategy address itself, not the per-asset
 * Converter.
 *
 * Returns the deposit transaction hash. The approval tx, if sent, is awaited
 * to receipt before proceeding so the deposit always runs against a fresh
 * allowance.
 */
export async function depositStrategy({
  asset,
  amount: amountRaw,
  assetDecimals,
  receiver,
  minSharesOut = 0n,
  approve = true,
  account,
  strategy,
  strategyId,
  provider,
  rpcUrl,
  env,
  chainId: requestedChainId,
}: DepositStrategyParameters): Promise<Hash> {
  if (!isAddress(asset)) {
    throw new Error(`Invalid deposit asset address: ${asset}`);
  }

  const amount = BigNumber(amountRaw);
  if (!amount.isGreaterThan(0)) {
    throw new Error(
      `Deposit amount must be greater than zero. Received: ${amount.toFixed()}.`,
    );
  }

  const {
    chainId,
    address: strategyAddress,
    abi,
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

  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  const walletClient = makeWalletClient({ provider, chainId });

  const allowanceRaw = (await publicClient.readContract({
    address: asset,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account, strategyAddress],
  })) as bigint;

  if (allowanceRaw < amountBase) {
    if (!approve) {
      throw new Error(
        `Deposit amount ${amount.toFixed()} exceeds allowance for ${asset} -> Strategy. Re-run with approve: true or pre-approve the Strategy contract.`,
      );
    }

    try {
      const { request } = await publicClient.simulateContract({
        account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
        address: asset,
        abi: erc20Abi,
        functionName: 'approve',
        args: [strategyAddress, amountBase],
      });
      const approveHash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    } catch (err) {
      throw new Error(
        `Approval of ${asset} for Strategy failed: ${getErrorMessage(err)}`,
      );
    }
  }

  try {
    const { request } = await publicClient.simulateContract({
      account,
      chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
      address: strategyAddress,
      abi,
      functionName: 'deposit',
      args: [asset, amountBase, receiver ?? account, minSharesOut],
    });
    return await walletClient.writeContract(request);
  } catch (err) {
    throw new Error(`Strategy deposit failed: ${getErrorMessage(err)}`);
  }
}
