import { Address, Hash } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { makeWalletClient } from '../../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../../common/chains';
import { CommonWriteParameters } from '../../../common/parameters';
import type { EarnWithdrawQueue } from '../../../contract-functions/withdrawEarn/withdrawEarn';
import { Token } from '../../../tokens/token-addresses';
import { getTokenInfo } from '../../../tokens/tokens';
import { EARN_VAULT, EarnChain, isEarnChain } from '../config';

/**
 * BoringOnChainQueue `OnChainWithdraw` struct required to cancel a request via
 * `cancelOnChainWithdraw`. Sourced from the boringQueue status response
 * (`Request.metadata`). Numerics accept number or bigint.
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

export type CancelWithdrawParameters = {
  /** The withdrawal asset of an AtomicQueue request. Defaults to Token.LBTC. */
  token?: Token;
  /**
   * Queue to cancel against. Defaults to `'boring'`, where every request
   * since 6.0.0 is filed. `'atomic'` cancels a request filed before then.
   */
  queue?: EarnWithdrawQueue;
  /**
   * BoringQueue request struct, required when `queue` is `'boring'`
   * (`cancelOnChainWithdraw` matches on the full struct hash).
   */
  request?: BoringWithdrawRequest;
} & CommonWriteParameters;

/**
 * @internal
 * Shared implementation for `cancelEarnWithdrawal` and the
 * `evm.cancelWithdraw()` action.
 */
export async function cancelWithdrawInternal({
  token = Token.LBTC,
  queue = 'boring',
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
        'BoringQueue cancel requires the original request struct: pass the `request` of an open or expired withdrawal from getEarnWithdrawals.',
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

  // --- AtomicQueue, for a request filed before 6.0.0: zero out the slot ---
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
