import BigNumber from 'bignumber.js';
import { Address, erc20Abi } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { CommonParameters } from '../../common/parameters';
import { toBaseDenomination } from '../../tokens/tokens';
import toBigInt from '../../utils/numbers';
import { fromSatoshi } from '../../utils/satoshi';
import {
  BTCE_VAULT,
  isBtceVaultChain,
  isVedaVaultChain,
  Vault,
  VAULTS,
} from '../../vaults/lib/config';

export type PreviewWithdrawEarnParameters = {
  amount: BigNumber.Value;
  account: Address;
} & CommonParameters;

export interface PreviewWithdrawEarnResult {
  /** The steps the orchestrator will execute, in order. */
  steps: Array<'approve' | 'unwrap' | 'queue'>;
  /** Number of wallet popups the user will see. */
  expectedPopups: number;
  /** Underlying-share balance the user holds directly. */
  underlyingBalance: BigNumber;
  /** Raw BTCe shares the user holds. */
  btceBalance: BigNumber;
  /** Underlying-share amount that needs to come from BTCe unwrap (zero if not needed). */
  unwrapAmount: BigNumber;
  /** Whether the requested amount is covered by the user's total position. */
  isCovered: boolean;
}

/**
 * Predicts the steps `withdrawEarn` would execute for a given amount, without
 * sending any transactions. Useful for rendering a step indicator before the
 * user signs.
 *
 * Reads the user's underlying-share balance, BTCe balance, and current
 * allowance to the withdraw queue. Returns the ordered list of steps and the
 * predicted wallet-popup count.
 */
export async function previewWithdrawEarn({
  amount: amountRaw,
  account,
  chainId,
  rpcUrl,
}: PreviewWithdrawEarnParameters): Promise<PreviewWithdrawEarnResult> {
  if (!isVedaVaultChain(chainId)) {
    throw new Error(
      `Unsupported chain ${chainId}. Earn withdrawals are supported on: ${VAULTS[Vault.Veda].chains.join(', ')}.`,
    );
  }

  const amount = BigNumber(amountRaw);
  if (!amount.isGreaterThan(0)) {
    throw new Error(
      `Withdraw amount must be greater than zero. Received: ${amount.toFixed()}.`,
    );
  }

  const vault = VAULTS[Vault.Veda];
  const vaultAddress = vault.vaultContract.address as Address;
  const lensAddress = vault.lensContract.address as Address;
  const queueAddress = vault.withdrawQueueContracts[chainId].address as Address;
  const amountBase = toBigInt(toBaseDenomination(amount, vault.decimals));

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const btceSupported = isBtceVaultChain(chainId);

  const [underlyingRaw, btceRaw, allowanceRaw] = await Promise.all([
    publicClient.readContract({
      address: lensAddress,
      abi: vault.lensContract.abi,
      functionName: 'balanceOf',
      args: [account, vaultAddress],
    }) as Promise<bigint>,
    btceSupported
      ? (publicClient.readContract({
          address: BTCE_VAULT.contracts[chainId],
          abi: BTCE_VAULT.abi,
          functionName: 'balanceOf',
          args: [account],
        }) as Promise<bigint>)
      : Promise.resolve(0n),
    publicClient.readContract({
      address: vaultAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account, queueAddress],
    }) as Promise<bigint>,
  ]);

  const isCovered = amountBase <= underlyingRaw + btceRaw;
  const lbtcvNeeded =
    amountBase > underlyingRaw ? amountBase - underlyingRaw : 0n;
  const unwrapAmount = btceSupported && lbtcvNeeded > 0n ? lbtcvNeeded : 0n;

  const steps: Array<'approve' | 'unwrap' | 'queue'> = [];
  if (allowanceRaw < amountBase) steps.push('approve');
  if (unwrapAmount > 0n) steps.push('unwrap');
  steps.push('queue');

  return {
    steps,
    expectedPopups: steps.length,
    underlyingBalance: fromSatoshi(String(underlyingRaw)),
    btceBalance: fromSatoshi(String(btceRaw)),
    unwrapAmount: fromSatoshi(String(unwrapAmount)),
    isCovered,
  };
}
