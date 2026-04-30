import BigNumber from 'bignumber.js';
import { Address, erc20Abi, Hash, maxUint256 } from 'viem';

import { makePublicClient } from '../../clients/public-client';
import { makeWalletClient } from '../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../common/chains';
import { CommonWriteParameters } from '../../common/parameters';
import { Token } from '../../tokens/token-addresses';
import { getTokenInfo, toBaseDenomination } from '../../tokens/tokens';
import { getErrorMessage } from '../../utils/err';
import toBigInt from '../../utils/numbers';
import { DAY } from '../../utils/time';
import {
  BTCE_VAULT,
  EARN_VAULT,
  isBtceVaultChain,
  isEarnChain } from '../../vaults/lib/config';

export type WithdrawEarnParameters = {
  /** Amount to withdraw, in the withdrawal asset's natural decimal units (BTC). */
  amount: BigNumber.Value;
  /**
   * The token to receive when the queue resolves.
   * Defaults to Token.LBTC. Must be a deposit-side asset accepted by the vault.
   */
  withdrawalAsset?: Token;
} & CommonWriteParameters;

export interface WithdrawEarnResult {
  /** Approval transaction hash, set only when an approval was required. */
  approveTxHash?: Hash;
  /** Unwrap transaction hash, set only when BTCe → underlying-share unwrapping was required. */
  unwrapTxHash?: Hash;
  /** Queue transaction hash, always set on success. */
  queueTxHash: Hash;
}

/**
 * Earn-native withdrawal orchestrator.
 *
 * Reads the user's combined position (direct underlying-share balance + BTCe),
 * checks LBTCv allowance to the withdraw queue, pre-flight checks the BTCe
 * wrapper's `maxWithdraw` so a doomed unwrap never wastes approval gas, then
 * sends 1-3 transactions in order:
 *
 *   1. (conditional) Approve underlying-share token to the withdraw queue with MaxUint256.
 *   2. (conditional) Unwrap just enough BTCe to cover the gap between `amount`
 *      and the user's direct underlying-share balance.
 *   3. (always) File an atomic withdrawal request against the underlying vault.
 *
 * Failure semantics:
 *   - Throws `InsufficientPositionError` BEFORE any tx if the requested amount
 *     exceeds `underlyingBalance + btceBalance`.
 *   - Throws `InsufficientUnwrappableError` BEFORE any tx if the BTCe wrapper's
 *     `maxWithdraw` shrank below the gap between read and unwrap.
 *   - Step-level failures throw with an explicit message; partial state is
 *     retry-safe via the orchestrator's skip logic.
 *
 * @returns {Promise<WithdrawEarnResult>} The transaction hashes for each step run.
 */
export async function withdrawEarn({
  amount: amountRaw,
  withdrawalAsset = Token.LBTC,
  account,
  chainId,
  provider,
  rpcUrl,
  env }: WithdrawEarnParameters): Promise<WithdrawEarnResult> {
  if (!isEarnChain(chainId)) {
    throw new Error(
      `Unsupported chain ${chainId}. Earn withdrawals are supported on: ${EARN_VAULT.chains.join(', ')}.`,
    );
  }

  const amount = BigNumber(amountRaw);
  if (!amount.isGreaterThan(0)) {
    throw new Error(
      `Withdraw amount must be greater than zero. Received: ${amount.toFixed()}.`,
    );
  }

  const vault = EARN_VAULT;
  const vaultAddress = vault.vaultContract.address as Address;
  const accountantAddress = vault.accountantContract.address as Address;
  const lensAddress = vault.lensContract.address as Address;
  const queueAddress = vault.withdrawQueueContracts[chainId].address as Address;
  const queueAbi = vault.withdrawQueueContracts[chainId].abi;

  const withdrawTokenInfo = await getTokenInfo(
    withdrawalAsset,
    chainId,
    env,
    rpcUrl,
  );
  if (!withdrawTokenInfo) {
    throw new Error(
      `Could not resolve withdrawal asset ${withdrawalAsset} on chain ${chainId}.`,
    );
  }

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ provider, chainId });

  const amountBase = toBigInt(toBaseDenomination(amount, vault.decimals));

  // --- Round 1: read all required state in parallel ---
  const btceSupported = isBtceVaultChain(chainId);
  const reads = await Promise.all([
    publicClient.readContract({
      address: lensAddress,
      abi: vault.lensContract.abi,
      functionName: 'balanceOf',
      args: [account, vaultAddress] }) as Promise<bigint>,
    btceSupported
      ? (publicClient.readContract({
          address: BTCE_VAULT.contracts[chainId],
          abi: BTCE_VAULT.abi,
          functionName: 'balanceOf',
          args: [account] }) as Promise<bigint>)
      : Promise.resolve(0n),
    publicClient.readContract({
      address: vaultAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account, queueAddress] }) as Promise<bigint>,
  ]);
  const underlyingBalance = reads[0];
  const btceBalance = reads[1];
  const allowance = reads[2];

  // --- Coverage check ---
  if (amountBase > underlyingBalance + btceBalance) {
    throw new Error(
      `InsufficientPositionError: requested ${amount.toFixed()} exceeds total position. underlyingBalance=${underlyingBalance.toString()}, btceBalance=${btceBalance.toString()}, amount=${amountBase.toString()}.`,
    );
  }

  // --- Pre-flight maxWithdraw check (council blocker B2) ---
  // Read maxWithdraw BEFORE any approval so a doomed unwrap never wastes
  // approval gas.
  const lbtcvNeeded =
    amountBase > underlyingBalance ? amountBase - underlyingBalance : 0n;
  let unwrapAmount = 0n;
  if (btceSupported && lbtcvNeeded > 0n) {
    const maxWithdraw = (await publicClient.readContract({
      address: BTCE_VAULT.contracts[chainId],
      abi: BTCE_VAULT.abi,
      functionName: 'maxWithdraw',
      args: [account] })) as bigint;

    if (maxWithdraw < lbtcvNeeded) {
      throw new Error(
        `InsufficientUnwrappableError: needed ${lbtcvNeeded.toString()} but BTCe.maxWithdraw(${account}) returned ${maxWithdraw.toString()}. The wrapper position may have shrunk between balance read and unwrap. No transactions sent.`,
      );
    }
    unwrapAmount = lbtcvNeeded;
  }

  const result: WithdrawEarnResult = {
    queueTxHash: '0x' as Hash, // overwritten below
  };

  // --- Step 1: approve (conditional) ---
  if (allowance < amountBase) {
    try {
      const { request } = await publicClient.simulateContract({
        account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
        address: vaultAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [queueAddress, maxUint256] });
      result.approveTxHash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({
        hash: result.approveTxHash });
    } catch (err) {
      throw new Error(
        `Approval of underlying share for withdraw queue failed: ${getErrorMessage(err)}`,
      );
    }
  }

  // --- Step 2: unwrap (conditional) ---
  if (unwrapAmount > 0n && btceSupported) {
    try {
      const { request } = await publicClient.simulateContract({
        account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
        address: BTCE_VAULT.contracts[chainId],
        abi: BTCE_VAULT.abi,
        functionName: 'withdraw',
        args: [unwrapAmount, account, account] });
      result.unwrapTxHash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({
        hash: result.unwrapTxHash });
    } catch (err) {
      throw new Error(
        `Unwrap from BTCe to underlying share failed: ${getErrorMessage(err)}. Approval${result.approveTxHash ? ` (${result.approveTxHash})` : ''} may already be in place.`,
      );
    }
  }

  // --- Step 3: queue (always) ---
  const expiry = BigNumber(Date.now())
    .dividedBy(1000)
    .plus(BigNumber(vault.queueWithdrawDaysValid).multipliedBy(DAY / 1000))
    .decimalPlaces(0, BigNumber.ROUND_DOWN);
  const discount = BigNumber(vault.queueWithdrawDiscountPercent).multipliedBy(
    10000,
  );

  try {
    const { request } = await publicClient.simulateContract({
      account,
      chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
      address: queueAddress,
      abi: queueAbi,
      functionName: 'safeUpdateAtomicRequest',
      args: [
        vaultAddress,
        withdrawTokenInfo.address,
        [BigInt(expiry.toFixed(0)), 0n, amountBase, false],
        accountantAddress,
        BigInt(discount.toFixed(0)),
      ] });
    result.queueTxHash = await walletClient.writeContract(request);
  } catch (err) {
    throw new Error(
      `Queue withdrawal failed: ${getErrorMessage(err)}. Prior steps may have completed: approve=${result.approveTxHash ?? 'n/a'}, unwrap=${result.unwrapTxHash ?? 'n/a'}.`,
    );
  }

  return result;
}
