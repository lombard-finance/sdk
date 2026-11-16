import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { Address, Hash } from 'viem';

import { getApiConfig } from '../../../common/api-config';
import { ChainId } from '../../../common/chains';
import { IEnvParam } from '../../../common/parameters';
import {
  fromBaseDenomination,
  getAssetInfo,
  TokenInfo,
} from '../../../tokens/tokens';
import { orderBy, unique } from '../../../utils/array';
import { ensureHex } from '../../../utils/hex';
import { httpRequest } from '../../../utils/http';
import {
  EARN_CHAIN_TO_NETWORK_MAP,
  EARN_VAULT,
  EarnChain,
  isEarnAvailable,
  isEarnChain,
} from '../config';
import type { BoringWithdrawRequest } from './withdraw';

export type GetEarnWithdrawalsParameters = IEnvParam & {
  account: Address;
  chainId: ChainId;
  rpcUrl?: string;
};

export type EarnWithdrawal = {
  token?: Omit<TokenInfo, 'abi'>;
  /** The amount of shares withdrawn */
  shareAmount: BigNumber;
  /** The amount of the withdrawal asset paid out. Set on a fulfilled request. */
  amount?: BigNumber;
  /** The price of a share locked in when the request was filed, in the withdrawal asset. */
  minPrice?: BigNumber;
  /** The expiration timestamp */
  deadline: number;
  /** The request timestamp */
  timestamp: number;
  /** The withdraw request transaction hash */
  txHash: Hash;
  /** The request block number */
  blockNumber: number;
  /** The fulfilment timestamp */
  fulfilledTimestamp?: number;
  /** The funds transfer transaction hash */
  fulfilledTxHash?: Hash;
  /** The fulfilment block number */
  fulfilledBlockNumber?: number;
  /** The chain id */
  chainId?: EarnChain;
  /** The user wallet address that made the withdrawal */
  toAddress?: Address;
  /** The cancellation timestamp, set on a cancelled request. */
  cancelledTimestamp?: number;
  /** The cancellation transaction hash, set on a cancelled request. */
  cancelledTxHash?: Hash;
  /** The cancellation block number, set on a cancelled request. */
  cancelledBlockNumber?: number;
  /**
   * The request as the queue stores it. Pass it to `cancelEarnWithdrawal` to
   * cancel an open or expired request; the queue matches on every field.
   */
  request?: BoringWithdrawRequest;
};

/** A chain that could not be read, and why. */
export type EarnWithdrawalFailure = {
  chainId: number;
  /** The underlying error, kept whole so a caller can inspect or report it. */
  error: unknown;
  /** A message safe to show a user. */
  message: string;
};

export type EarnWithdrawals = {
  cancelled: EarnWithdrawal[];
  expired: EarnWithdrawal[];
  fulfilled: EarnWithdrawal[];
  open: EarnWithdrawal[];
  /**
   * Chains that could not be queried. Empty on a clean read.
   *
   * Required, not optional. "Nothing to show" and "could not ask" are
   * different answers, and while the failures were swallowed the two rendered
   * identically — an authorization failure looked like an empty account.
   */
  failures: EarnWithdrawalFailure[];
};

/**
 * The on-chain request struct, as the queue stores it and as
 * `cancelEarnWithdrawal` needs it back. Every numeric field arrives as a
 * JSON number.
 */
type BoringRequestMetadata = {
  amountOfAssets: number;
  amountOfShares: number;
  assetOut: string;
  creationTime: number;
  nonce: number;
  secondsToDeadline: number;
  secondsToMaturity: number;
  user: string;
};

type BoringRequestFields = {
  /** Shares requested, in the vault's base units. */
  amount?: number;
  blockNumber?: number;
  metadata?: BoringRequestMetadata;
  offerToken?: string;
  timestamp?: number;
  /** The request transaction, without the `0x` prefix. */
  transaction_hash?: string;
  user?: string;
  wantToken?: string;
  wantTokenDecimals?: number;
  wantTokenSymbol?: string;
};

/** When the request left the queue: a fulfilment or a cancellation. */
type BoringRequestOutcome = {
  block_number?: number;
  timestamp?: number;
  transaction_hash?: string;
};

/**
 * One item of the boring-queue route. Open and expired items carry the request
 * fields at the top level; fulfilled and cancelled items nest them under
 * `Request`, beside a `Fulfillment` or `Cancellation` block.
 */
type BoringRequestItem = BoringRequestFields & {
  Request?: BoringRequestFields;
  Fulfillment?: BoringRequestOutcome;
  Cancellation?: BoringRequestOutcome;
};

type BoringQueueRequests = {
  cancelled_requests: BoringRequestItem[];
  expired_requests: BoringRequestItem[];
  fulfilled_requests: BoringRequestItem[];
  open_requests: BoringRequestItem[];
};

type BoringQueuePayload =
  | Partial<BoringQueueRequests>
  | { Response: Partial<BoringQueueRequests> };

const normalizeBoringQueueRequests = (
  payload?: BoringQueuePayload | null,
): BoringQueueRequests => {
  if (!payload || typeof payload !== 'object') {
    return {
      cancelled_requests: [],
      expired_requests: [],
      fulfilled_requests: [],
      open_requests: [],
    };
  }

  if ('Response' in payload) {
    return normalizeBoringQueueRequests(payload.Response);
  }

  const list = (value: unknown): BoringRequestItem[] =>
    Array.isArray(value) ? (value as BoringRequestItem[]) : [];

  return {
    cancelled_requests: list(payload.cancelled_requests),
    expired_requests: list(payload.expired_requests),
    fulfilled_requests: list(payload.fulfilled_requests),
    open_requests: list(payload.open_requests),
  };
};

const requestFields = (item: BoringRequestItem): BoringRequestFields =>
  item.Request ?? item;

const toCancelRequest = (
  metadata: BoringRequestMetadata | undefined,
): BoringWithdrawRequest | undefined =>
  metadata
    ? {
        nonce: metadata.nonce,
        user: metadata.user,
        assetOut: metadata.assetOut,
        amountOfShares: metadata.amountOfShares,
        amountOfAssets: metadata.amountOfAssets,
        creationTime: metadata.creationTime,
        secondsToMaturity: metadata.secondsToMaturity,
        secondsToDeadline: metadata.secondsToDeadline,
      }
    : undefined;

type TokenLookup = Record<Address, Omit<TokenInfo, 'abi'> | undefined>;

/**
 * Maps one boring-queue item onto `EarnWithdrawal`.
 *
 * The queue locks the asset amount when the request is filed, so `minPrice`
 * is that amount over the shares, in the withdrawal asset's units per share.
 * `amount` is reported for a fulfilled request only, as it was before: it is
 * what was paid, and an open request has paid nothing yet.
 */
const mapBoringRequestItem = (
  item: BoringRequestItem,
  tokens: TokenLookup,
  chainId: EarnChain,
  account: Address,
): EarnWithdrawal => {
  const request = requestFields(item);
  const metadata = request.metadata;
  const token = request.wantToken
    ? tokens[ensureHex(request.wantToken)]
    : undefined;
  const assetDecimals = token?.decimals ?? request.wantTokenDecimals ?? 0;

  const shares = fromBaseDenomination(
    request.amount ?? metadata?.amountOfShares ?? 0,
    EARN_VAULT.decimals,
  );
  const assets = metadata
    ? fromBaseDenomination(metadata.amountOfAssets, assetDecimals)
    : undefined;

  const withdrawal: EarnWithdrawal = {
    shareAmount: shares,
    amount: item.Fulfillment ? assets : undefined,
    minPrice:
      assets && shares.isGreaterThan(0) ? assets.dividedBy(shares) : undefined,
    // The request can be solved from creationTime + secondsToMaturity, and
    // stays solvable for secondsToDeadline after that.
    deadline: metadata
      ? metadata.creationTime +
        metadata.secondsToMaturity +
        metadata.secondsToDeadline
      : 0,
    timestamp: request.timestamp ?? metadata?.creationTime ?? 0,
    txHash: ensureHex(request.transaction_hash ?? ''),
    blockNumber: request.blockNumber ?? 0,
    token,
    chainId,
    toAddress: account,
    request: toCancelRequest(metadata),
  };

  if (item.Fulfillment) {
    withdrawal.fulfilledTimestamp = item.Fulfillment.timestamp;
    withdrawal.fulfilledBlockNumber = item.Fulfillment.block_number;
    withdrawal.fulfilledTxHash = item.Fulfillment.transaction_hash
      ? ensureHex(item.Fulfillment.transaction_hash)
      : undefined;
  }

  if (item.Cancellation) {
    withdrawal.cancelledTimestamp = item.Cancellation.timestamp;
    withdrawal.cancelledBlockNumber = item.Cancellation.block_number;
    withdrawal.cancelledTxHash = item.Cancellation.transaction_hash
      ? ensureHex(item.Cancellation.transaction_hash)
      : undefined;
  }

  return withdrawal;
};

/**
 * Retrieves the withdrawals made by specified address.
 *
 * Reads the BoringQueue requests filed from `account` on `chainId`. Requests
 * filed against the older AtomicQueue are not part of this history.
 *
 * A public read: the route serves any address's vault history and takes no
 * wallet token, so none is sent and `auth` is not used.
 *
 * @param parameters - The parameters.
 * @param parameters.account - The account address.
 * @param parameters.chainId - The chain id.
 * @param parameters.rpcUrl - The optional RPC url.
 *
 * @returns {Promise<EarnWithdrawals>}
 */
export async function getEarnWithdrawals({
  account,
  chainId,
  rpcUrl,
  env,
}: GetEarnWithdrawalsParameters): Promise<EarnWithdrawals> {
  const vault = EARN_VAULT;
  if (!isEarnChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  const network = EARN_CHAIN_TO_NETWORK_MAP[chainId];
  const { bffApiUrl } = getApiConfig(env);
  if (!bffApiUrl) {
    throw new Error(
      `Could not determine API endpoint for provided environment: ${env}`,
    );
  }

  const url = `${bffApiUrl}/sevenseas-api/boring-queue/${network}/${vault.vaultContract.address}/${account}`;

  const { data } = await httpRequest<BoringQueuePayload>({
    url,
    scope: 'public',
  });
  const response = normalizeBoringQueueRequests(data);

  const allItems = [
    ...response.cancelled_requests,
    ...response.expired_requests,
    ...response.fulfilled_requests,
    ...response.open_requests,
  ];

  // The route names each request's asset, its symbol and its decimals, so the
  // chain is asked only about an asset it describes incompletely.
  const tokens: TokenLookup = {};
  for (const item of allItems) {
    const request = requestFields(item);
    if (!request.wantToken) continue;
    const address = ensureHex(request.wantToken);
    if (address in tokens) continue;
    if (
      request.wantTokenSymbol !== undefined &&
      request.wantTokenDecimals !== undefined
    ) {
      tokens[address] = {
        address,
        decimals: request.wantTokenDecimals,
        symbol: request.wantTokenSymbol,
      };
    }
  }
  const unresolved = unique(
    allItems
      .map((item) => requestFields(item).wantToken)
      .filter((address): address is string => !!address)
      .map((address) => ensureHex(address))
      .filter((address) => !(address in tokens)),
  );
  for (const asset of unresolved) {
    const assetInfo = await getAssetInfo(asset, chainId, rpcUrl, env);
    tokens[asset] = assetInfo
      ? {
          address: assetInfo.address,
          decimals: assetInfo.decimals,
          symbol: assetInfo.symbol,
        }
      : undefined;
  }

  const map = (items: BoringRequestItem[]) =>
    items.map((item) => mapBoringRequestItem(item, tokens, chainId, account));

  return {
    cancelled: orderBy(
      map(response.cancelled_requests),
      (a) => a.timestamp,
      'desc',
    ),
    expired: orderBy(
      map(response.expired_requests),
      (a) => a.timestamp,
      'desc',
    ),
    fulfilled: orderBy(
      map(response.fulfilled_requests),
      (a) => a.fulfilledTimestamp || a.timestamp,
      'desc',
    ),
    open: orderBy(map(response.open_requests), (a) => a.timestamp, 'desc'),
    // This function throws on failure, so a value returned here is a clean read.
    failures: [],
  };
}

export type GetEarnWithdrawalsAllChainsParameters = IEnvParam & {
  account: Address;
  rpcUrl?: string;
};

/**
 * Retrieves the withdrawals made by specified address across all supported chains for a vault.
 * This is useful for getting a complete view of all withdrawals regardless of the currently connected chain.
 *
 * @param parameters - The parameters.
 * @param parameters.account - The account address.
 * @param parameters.rpcUrl - The optional RPC url.
 * @param parameters.env - The optional environment identifier.
 *
 * @returns {Promise<EarnWithdrawals>} All withdrawals across all supported chains, categorized and sorted
 */
export async function getEarnWithdrawalsAllChains({
  account,
  rpcUrl,
  env,
}: GetEarnWithdrawalsAllChainsParameters): Promise<EarnWithdrawals> {
  const vault = EARN_VAULT;

  // Earn is configured for mainnet only. Reporting that is the difference
  // between an empty page and an honest one: without this, a stage caller got
  // three failed reads against mainnet contracts and an empty result.
  if (!isEarnAvailable(env ?? DEFAULT_ENV)) {
    const message = `The Earn vault is only configured for ${Env.prod}; it is unavailable on ${env ?? DEFAULT_ENV}.`;
    return {
      cancelled: [],
      expired: [],
      fulfilled: [],
      open: [],
      failures: vault.chains.map((chainId: EarnChain) => ({
        chainId,
        error: new Error(message),
        message,
      })),
    };
  }

  // Each chain is read independently so one failure does not lose the others,
  // but a failure is now carried out rather than logged and discarded.
  const withdrawalsPromises = vault.chains.map((chainId: EarnChain) =>
    getEarnWithdrawals({ account, chainId, rpcUrl, env }).catch(
      (error: unknown) => ({
        cancelled: [],
        expired: [],
        fulfilled: [],
        open: [],
        failures: [
          {
            chainId,
            error,
            message:
              error instanceof Error
                ? error.message
                : `Could not read withdrawals on chain ${chainId}.`,
          },
        ],
      }),
    ),
  );

  const withdrawalsArrays = await Promise.all(withdrawalsPromises);

  // Combine all withdrawals from all chains
  const allCancelled: EarnWithdrawal[] = [];
  const allExpired: EarnWithdrawal[] = [];
  const allFulfilled: EarnWithdrawal[] = [];
  const allOpen: EarnWithdrawal[] = [];
  const allFailures: EarnWithdrawalFailure[] = [];

  for (const withdrawals of withdrawalsArrays) {
    allFailures.push(...withdrawals.failures);
    allCancelled.push(...withdrawals.cancelled);
    allExpired.push(...withdrawals.expired);
    allFulfilled.push(...withdrawals.fulfilled);
    allOpen.push(...withdrawals.open);
  }

  // Sort each category by timestamp (newest first)
  return {
    cancelled: orderBy(allCancelled, (a) => a.timestamp, 'desc'),
    expired: orderBy(allExpired, (a) => a.timestamp, 'desc'),
    fulfilled: orderBy(
      allFulfilled,
      (a) => a.fulfilledTimestamp || a.timestamp,
      'desc',
    ),
    open: orderBy(allOpen, (a) => a.timestamp, 'desc'),
    failures: allFailures,
  };
}
