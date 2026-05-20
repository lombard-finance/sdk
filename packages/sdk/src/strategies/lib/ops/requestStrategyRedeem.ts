import { Address, decodeEventLog, isAddress, Log } from 'viem';

import { makePublicClient } from '../../../clients/public-client';
import { makeWalletClient } from '../../../clients/wallet-client';
import { CHAIN_ID_TO_VIEM_CHAIN_MAP } from '../../../common/chains';
import { CommonWriteParameters } from '../../../common/parameters';
import { getErrorMessage } from '../../../utils/err';
import { LOMBARD_STRATEGY } from '../config';
import { IRequestStrategyRedeemResult } from '../types';
import { assertLombardStrategyChain, resolveStrategyAddress } from '../utils';

export type RequestStrategyRedeemParameters = {
  /**
   * Strategy contract address. Defaults to the canonical address for the
   * chain (Bitcoin Stretch on Base Sepolia).
   */
  strategy?: Address;
  /**
   * Number of shares to redeem, in Strategy share base units (1e8 for
   * Bitcoin Stretch). Caller is responsible for the human-readable
   * conversion; pass `toBigInt(toBaseDenomination(human, decimals))` if
   * starting from a UI value.
   */
  shares: bigint;
  /**
   * Owner of the shares whose redemption is being requested. Defaults to
   * `account`. Pre-approval of the share token to the Strategy is required
   * if `owner !== account` (i.e. a third party submitting the request).
   *
   * NOTE: payout always goes to this `owner` address. There is no separate
   * `receiver` argument on the Strategy contract — if you need to redirect
   * the payout, transfer the shares to the target address first and submit
   * `requestRedeem` from there.
   */
  owner?: Address;
  /**
   * Whether to wait for the transaction receipt (and parse `requestId`
   * from the `RedeemRequested` event). When `false`, returns
   * `{ txHash, requestId: undefined }` immediately for callers that own
   * their own settlement loop (e.g. Safe multisig polling).
   * @default true
   */
  waitForReceipt?: boolean;
} & CommonWriteParameters;

/**
 * Submits an async redemption request to the Strategy.
 *
 * Calls `requestRedeem(shares, owner)`. The request is stored on-chain and
 * fulfilled later off-chain by an operator with `PAY_REDEMPTIONS_ROLE`.
 * There is no synchronous on-chain redeem path; UI should display the
 * settlement target from the Strategy config and poll
 * `getStrategyPendingRedeem(requestId)` for progress.
 *
 * Two depositor-facing constraints worth surfacing in UI:
 *
 *   1. Pending requests CANNOT be cancelled. Once submitted, the shares
 *      stay locked until the operator settles. There is no `cancelRedeem`
 *      function on the contract.
 *   2. Payout always goes to `owner`. The contract takes no separate
 *      `receiver` argument; redirect via share transfer + new request,
 *      not via an SDK parameter.
 *
 * Returns `{ txHash, requestId }`. The `requestId` is parsed from the
 * `RedeemRequested` event in the tx receipt; if the receipt is not yet
 * mined (e.g. `waitForReceipt: false` for Safe multisig deferred
 * execution), `requestId` is `undefined` and the caller should derive it
 * from `pendingAssetsOf(owner)` polling once the tx settles.
 */
export async function requestStrategyRedeem({
  strategy,
  shares,
  owner,
  waitForReceipt = true,
  account,
  chainId,
  provider,
  rpcUrl,
  env,
}: RequestStrategyRedeemParameters): Promise<IRequestStrategyRedeemResult> {
  assertLombardStrategyChain(chainId);
  if (shares <= 0n) {
    throw new Error(
      `Redeem shares must be greater than zero. Received: ${shares.toString()}.`,
    );
  }
  const ownerAddress = owner ?? account;
  if (!isAddress(ownerAddress)) {
    throw new Error(`Invalid owner address: ${ownerAddress}`);
  }

  const strategyAddress = resolveStrategyAddress(chainId, strategy);

  const publicClient = makePublicClient({ chainId, rpcUrl, env });
  const walletClient = makeWalletClient({ provider, chainId });

  let txHash;
  try {
    const { request } = await publicClient.simulateContract({
      account,
      chain: CHAIN_ID_TO_VIEM_CHAIN_MAP[chainId],
      address: strategyAddress,
      abi: LOMBARD_STRATEGY.abi,
      functionName: 'requestRedeem',
      args: [shares, ownerAddress],
    });
    txHash = await walletClient.writeContract(request);
  } catch (err) {
    throw new Error(`requestRedeem failed: ${getErrorMessage(err)}`);
  }

  if (!waitForReceipt) {
    return { txHash, requestId: undefined };
  }

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  const requestId = parseRequestIdFromLogs(receipt.logs, strategyAddress);

  return { txHash, requestId };
}

/**
 * Scans the receipt logs for the `RedeemRequested` event emitted by the
 * Strategy and returns the `requestId`. Returns `undefined` if no
 * matching log is found (e.g. the wallet executor batched the call and the
 * event is not emitted under the expected address).
 */
function parseRequestIdFromLogs(
  logs: ReadonlyArray<Log>,
  strategyAddress: Address,
): bigint | undefined {
  const target = strategyAddress.toLowerCase();
  for (const log of logs) {
    if (log.address.toLowerCase() !== target) continue;
    try {
      const decoded = decodeEventLog({
        abi: LOMBARD_STRATEGY.abi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== 'RedeemRequested') continue;
      const args = decoded.args as
        | { requestId?: bigint }
        | readonly unknown[]
        | undefined;
      if (args && !Array.isArray(args) && 'requestId' in args) {
        return (args as { requestId: bigint }).requestId;
      }
      if (Array.isArray(args) && args.length > 0) {
        return args[0] as bigint;
      }
    } catch {
      // Log topics did not match any event in the Strategy ABI. Treat as
      // a foreign log and move on instead of failing the whole receipt
      // parse: the wallet may have batched a call (e.g. Safe multisend)
      // and emitted helper events from other contracts.
      continue;
    }
  }
  return undefined;
}
