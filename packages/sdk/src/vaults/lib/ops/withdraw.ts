import BigNumber from 'bignumber.js';
import { Address, Hash } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { makeWalletClient } from '../../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../../common/chains';
import { CommonWriteParameters } from '../../../common/parameters';
import { EarnWithdrawQueue } from '../../../contract-functions/withdrawEarn/withdrawEarn';
import { Token } from '../../../tokens/token-addresses';
import {
  fromBaseDenomination,
  getTokenInfo,
  toBaseDenomination,
} from '../../../tokens/tokens';
import { getErrorMessage } from '../../../utils/err';
import toBigInt from '../../../utils/numbers';
import { DAY } from '../../../utils/time';
import { EARN_VAULT, EarnChain, isEarnChain } from '../config';

/**
 * BoringOnChainQueue `OnChainWithdraw` struct required to cancel a request via
 * `cancelOnChainWithdraw`. Comes straight from the SevenSeas boringQueue
 * response (`Request.metadata`). Numerics accept number or bigint.
 */
export interface BoringWithdrawRequest {
  nonce: number | bigint;
  user: string;
  assetOut: string;
  amountOfShares: number | bigint;
  amountOfAssets: number | bigint;
  creationTime: number | bigint;
  secondsToMaturity: number | bigint;
  secondsToDeadline: number | bigint;
}

export type QueueWithdrawParameters = {
  /** The amount to be withdrawn from the DeFi vault. */
  amount: BigNumber.Value;
  /**
   * A flag determining whether the amount should be approved within
   * the execution of this function. If set to `false` it will
   * throw an error when the withdraw amount exceeds allowance.
   */
  approve?: boolean;
  /** The optional deposit asset. */
  token?: Token;
} & CommonWriteParameters;

/**
 * @internal Internal helper used by `EvmWithdraw` and other action classes.
 * The public `queueWithdraw` function was removed in 5.0.0; consumers use
 * `withdrawEarn` instead.
 *
 * @returns {Promise<Hash>}
 */
export async function queueWithdrawInternal({
  amount: amountRaw,
  approve = true,
  token = Token.LBTC,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
}: QueueWithdrawParameters) {
  const vault = EARN_VAULT;
  if (!isEarnChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ provider, chainId });

  const withdrawToken = await getTokenInfo(token, chainId, env, rpcUrl);
  if (!withdrawToken) {
    throw new Error(`Unknown withdraw token: ${token}`);
  }

  const amount = BigNumber(amountRaw);
  const amountBase = toBigInt(toBaseDenomination(amount, vault.decimals));

  const balanceRaw = await publicClient.readContract({
    address: vault.lensContract.address,
    abi: vault.lensContract.abi,
    functionName: 'balanceOf',
    args: [account, vault.vaultContract.address],
  });
  const balance = fromBaseDenomination(String(balanceRaw), vault.decimals);

  const allowanceRaw = await publicClient.readContract({
    address: vault.vaultContract.address,
    abi: vault.vaultContract.abi,
    functionName: 'allowance',
    args: [account, vault.withdrawQueueContracts[chainId].address],
  });
  const allowance = fromBaseDenomination(String(allowanceRaw), vault.decimals);

  // check if amount exceeds balance
  if (amount.isGreaterThan(balance)) {
    throw new Error(
      `The withdraw amount exceeds the account's balance. \nWithdraw amount: ${amount.toFixed()} \nBalance: ${balance.toFixed()}`,
    );
  }

  // check if amount exceeds allowance
  if (amount.isGreaterThan(allowance)) {
    const exceededMessage = `The withdraw amount exceeds allowance. \nWithdraw amount: ${amount.toFixed()} \nAllowance: ${allowance.toFixed()}`;
    if (!approve) {
      throw new Error(exceededMessage);
    }

    // try to approve new amount
    try {
      console.info(`Trying to approve ${amountBase}`);
      const { request } = await publicClient.simulateContract({
        account,
        chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
        address: vault.vaultContract.address,
        abi: vault.vaultContract.abi,
        functionName: 'approve',
        args: [vault.withdrawQueueContracts[chainId].address, amountBase],
      });

      const txHash = await walletClient.writeContract(request);
      console.info(`Approve tx hash: ${txHash}`);
      console.info(`Approved ${amountBase} for ${vault.vaultContract.address}`);
    } catch (err) {
      const msg = getErrorMessage(err);
      throw new Error(
        `Could not approve ${amountBase} for ${vault.vaultContract.address}. \nReason: ${msg}`,
      );
    }
  }

  // queue withdraw vault token to wihdraw token via the withdraw queue contract
  const expiry = BigNumber(Date.now())
    .dividedBy(1000)
    .plus(BigNumber(vault.queueWithdrawDaysValid).multipliedBy(DAY / 1000))
    .decimalPlaces(0, BigNumber.ROUND_DOWN); // expiry = now(seconds) + days(seconds)

  const discount = BigNumber(vault.queueWithdrawDiscountPercent).multipliedBy(
    10000, // 1% = 10000
  );

  const { request } = await publicClient.simulateContract({
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    address: vault.withdrawQueueContracts[chainId].address,
    abi: vault.withdrawQueueContracts[chainId].abi,
    functionName: 'safeUpdateAtomicRequest',
    args: [
      vault.vaultContract.address,
      withdrawToken.address,
      [expiry.toFixed(0), 0n, amountBase, false],
      vault.accountantContract.address,
      discount.toFixed(0),
    ],
  });

  const txHash = await walletClient.writeContract(request);
  return txHash;
}

export type CancelWithdrawParameters = Pick<QueueWithdrawParameters, 'token'> & {
  /** Queue to cancel against. Defaults to `'atomic'`. */
  queue?: EarnWithdrawQueue;
  /**
   * BoringQueue request struct — REQUIRED when `queue` is `'boring'`
   * (`cancelOnChainWithdraw` matches on the full struct hash).
   */
  request?: BoringWithdrawRequest;
} & CommonWriteParameters;

/**
 * @internal
 * Shared implementation for cancelWithdraw / cancelEarnWithdrawal so the new
 * Earn-native function does not trigger the deprecation warning when calling
 * through.
 */
export async function cancelWithdrawInternal({
  token = Token.LBTC,
  queue = 'atomic',
  request: boringRequest,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
}: CancelWithdrawParameters): Promise<Hash> {
  const vault = EARN_VAULT;
  if (!isEarnChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  const publicClient = makePublicClient({ chainId, rpcUrl });
  const walletClient = makeWalletClient({ provider, chainId });

  // --- BoringQueue: cancelOnChainWithdraw(request struct) ---
  if (queue === 'boring') {
    const boringQueue = vault.boringQueueContracts[chainId as EarnChain];
    if (!boringQueue) {
      throw new Error(
        `BoringQueue cancel is not available on chain ${chainId}. Supported: ${Object.keys(
          vault.boringQueueContracts,
        ).join(', ')}.`,
      );
    }
    if (!boringRequest) {
      throw new Error(
        'BoringQueue cancel requires the original request struct (from the boringQueue status response).',
      );
    }

    const { request } = await publicClient.simulateContract({
      account,
      chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
      address: boringQueue.address as Address,
      abi: boringQueue.abi,
      functionName: 'cancelOnChainWithdraw',
      args: [
        {
          nonce: BigInt(boringRequest.nonce),
          user: boringRequest.user as Address,
          assetOut: boringRequest.assetOut as Address,
          amountOfShares: BigInt(boringRequest.amountOfShares),
          amountOfAssets: BigInt(boringRequest.amountOfAssets),
          creationTime: BigInt(boringRequest.creationTime),
          secondsToMaturity: BigInt(boringRequest.secondsToMaturity),
          secondsToDeadline: BigInt(boringRequest.secondsToDeadline),
        },
      ],
    });

    return walletClient.writeContract(request);
  }

  // --- Legacy AtomicQueue: zero out the request ---
  const withdrawToken = await getTokenInfo(token, chainId, env, rpcUrl);
  if (!withdrawToken) {
    throw new Error(`Unknown withdraw token: ${token}`);
  }

  // cancel withdrawal via withdraw queue contract
  const { request } = await publicClient.simulateContract({
    account,
    chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
    address: vault.withdrawQueueContracts[chainId].address,
    abi: vault.withdrawQueueContracts[chainId].abi,
    functionName: 'updateAtomicRequest',
    args: [
      vault.vaultContract.address,
      withdrawToken.address,
      [0, 0, 0, false],
    ],
  });

  const txHash = await walletClient.writeContract(request);
  return txHash;
}
