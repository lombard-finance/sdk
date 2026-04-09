import axios from "axios";
import BigNumber from "bignumber.js";
import { Address, Hash } from "viem";

import { getApiConfig } from "../../../common/api-config";
import { ChainId } from "../../../common/chains";
import { IEnvParam } from "../../../common/parameters";
import {
  fromBaseDenomination,
  getAssetInfo,
  TokenInfo,
} from "../../../tokens/tokens";
import { orderBy, unique } from "../../../utils/array";
import { ensureHex } from "../../../utils/hex";
import {
  isVedaVaultChain,
  Vault,
  VAULTS,
  VEDA_VAULT_CHAIN_TO_NETWORK_MAP,
  VedaVaultChain,
} from "../config";

export type GetVaultWithdrawalsParameters = IEnvParam & {
  account: Address;
  chainId: ChainId;
  vaultKey?: Vault;
  rpcUrl?: string;
};

export type VaultWithdrawal = {
  token?: Omit<TokenInfo, "abi">;
  /** The amount of shares withdrawn */
  shareAmount: BigNumber;
  /** The amount of funds withdrawn */
  amount?: BigNumber;
  /** The min price of a share */
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
  chainId?: VedaVaultChain;
  /** The user wallet address that made the withdrawal */
  toAddress?: Address;
};

export type VaultWithdrawals = {
  cancelled: VaultWithdrawal[];
  expired: VaultWithdrawal[];
  fulfilled: VaultWithdrawal[];
  open: VaultWithdrawal[];
};

type WithdrawRequest = {
  amount: number;
  blockNumber: number;
  deadline: number;
  minPrice: number;
  timestamp: number;
  transactionHash: string;
  wantToken: string;
};

type FulfilledRequest = {
  // Yup, there's a typo in the response, double L is expected.
  Fulfillment: {
    blockNumber: number;
    offerAmountSpent: number;
    timestamp: number;
    transactionHash: string;
    wantAmountReceived: number;
    wantToken: string;
  };
  Request: WithdrawRequest;
};

type SevenSeasWithdrawRequests = {
  cancelled_requests?: WithdrawRequest[];
  expired_requests?: WithdrawRequest[];
  fulfilled_requests?: FulfilledRequest[];
  open_requests?: WithdrawRequest[];
};

type WithdrawalsPayload =
  | SevenSeasWithdrawRequests
  | { Response: SevenSeasWithdrawRequests };

const EMPTY_WITHDRAW_REQUESTS: SevenSeasWithdrawRequests = {
  cancelled_requests: [],
  expired_requests: [],
  fulfilled_requests: [],
  open_requests: [],
};

const normalizeSevenSeasWithdrawRequests = (
  payload?: WithdrawalsPayload,
): SevenSeasWithdrawRequests => {
  if (!payload) {
    return EMPTY_WITHDRAW_REQUESTS;
  }

  if ("Response" in payload) {
    return normalizeSevenSeasWithdrawRequests(payload.Response);
  }

  return {
    cancelled_requests: payload.cancelled_requests ?? [],
    expired_requests: payload.expired_requests ?? [],
    fulfilled_requests: payload.fulfilled_requests ?? [],
    open_requests: payload.open_requests ?? [],
  };
};

/**
 * Retrieves the withdrawals made by specified address.
 * @param parameters - The parameters.
 * @param parameters.account - The account address.
 * @param parameters.chainId - The chain id.
 * @param parameters.vaultKey - The optional vault identifier.
 * @param parameters.rpcUrl - The optional RPC url.
 *
 * @returns {Promise<VaultWithdrawals>}
 */
export async function getVaultWithdrawals({
  account,
  chainId,
  vaultKey = Vault.Veda,
  rpcUrl,
  env,
}: GetVaultWithdrawalsParameters) {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  if (!isVedaVaultChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(", ")}`,
    );
  }

  const network = VEDA_VAULT_CHAIN_TO_NETWORK_MAP[chainId];
  const { bffApiUrl } = getApiConfig(env);
  if (!bffApiUrl) {
    throw new Error(
      `Could not determine API endpoint for provided environment: ${env}`,
    );
  }

  const endpoint = `${bffApiUrl}/sevenseas-api/withdraw-requests/${network}/${vault.vaultContract.address}/${account}`;
  const searchParams = new URLSearchParams({
    historical: "true",
  });
  const url = `${endpoint}?${searchParams.toString()}`;

  const { data } = await axios.get<WithdrawalsPayload>(url);
  const response = normalizeSevenSeasWithdrawRequests(data);

  const cancelledRequests = response.cancelled_requests ?? [];
  const expiredRequests = response.expired_requests ?? [];
  const fulfilledRequests = response.fulfilled_requests ?? [];
  const openRequests = response.open_requests ?? [];

  const withdrawAssetsAddresses = unique([
    ...cancelledRequests.map((a) => ensureHex(a.wantToken)),
    ...expiredRequests.map((a) => ensureHex(a.wantToken)),
    ...fulfilledRequests.map((a) => ensureHex(a.Request.wantToken)),
    ...openRequests.map((a) => ensureHex(a.wantToken)),
  ]);

  const withdrawAssets: Record<Address, Omit<TokenInfo, "abi"> | undefined> =
    {};
  for (const asset of withdrawAssetsAddresses) {
    const assetInfo = await getAssetInfo(asset, chainId, rpcUrl);
    if (assetInfo) {
      withdrawAssets[asset] = {
        address: assetInfo.address,
        decimals: assetInfo.decimals,
        symbol: assetInfo.symbol,
      };
    } else {
      withdrawAssets[asset] = undefined;
    }
  }

  const cancelled = cancelledRequests.map((w) => {
    const token = withdrawAssets[ensureHex(w.wantToken)];
    const withdrawal: VaultWithdrawal = {
      amount: undefined,
      blockNumber: w.blockNumber,
      deadline: w.deadline,
      shareAmount: fromBaseDenomination(w.amount, vault.decimals),
      timestamp: w.timestamp,
      txHash: ensureHex(w.transactionHash),
      token,
      chainId,
      toAddress: account,
    };
    return withdrawal;
  });
  const expired = expiredRequests.map((w) => {
    const token = withdrawAssets[ensureHex(w.wantToken)];
    const withdrawal: VaultWithdrawal = {
      amount: undefined,
      blockNumber: w.blockNumber,
      deadline: w.deadline,
      shareAmount: fromBaseDenomination(w.amount, vault.decimals),
      timestamp: w.timestamp,
      txHash: ensureHex(w.transactionHash),
      token,
      chainId,
      toAddress: account,
    };
    return withdrawal;
  });
  const fulfilled = fulfilledRequests.map((w) => {
    const token = withdrawAssets[ensureHex(w.Request.wantToken)];
    const withdrawal: VaultWithdrawal = {
      amount: fromBaseDenomination(
        w.Fulfillment.wantAmountReceived,
        token?.decimals || 0,
      ),
      blockNumber: w.Request.blockNumber,
      deadline: w.Request.deadline,
      shareAmount: fromBaseDenomination(
        w.Fulfillment.offerAmountSpent,
        vault.decimals,
      ),
      timestamp: w.Request.timestamp,
      txHash: ensureHex(w.Request.transactionHash),
      token,
      fulfilledBlockNumber: w.Fulfillment.blockNumber,
      fulfilledTimestamp: w.Fulfillment.timestamp,
      fulfilledTxHash: ensureHex(w.Fulfillment.transactionHash),
      minPrice: fromBaseDenomination(w.Request.minPrice, token?.decimals || 0),
      chainId,
      toAddress: account,
    };
    return withdrawal;
  });
  const open = openRequests.map((w) => {
    const token = withdrawAssets[ensureHex(w.wantToken)];
    const withdrawal: VaultWithdrawal = {
      amount: undefined,
      blockNumber: w.blockNumber,
      deadline: w.deadline,
      shareAmount: fromBaseDenomination(w.amount, vault.decimals),
      timestamp: w.timestamp,
      txHash: ensureHex(w.transactionHash),
      token,
      minPrice: fromBaseDenomination(w.minPrice, token?.decimals || 0),
      chainId,
      toAddress: account,
    };
    return withdrawal;
  });

  const wihdrawals: VaultWithdrawals = {
    cancelled: orderBy(cancelled, (a) => a.timestamp, "desc"),
    expired: orderBy(expired, (a) => a.timestamp, "desc"),
    fulfilled: orderBy(
      fulfilled,
      (a) => a.fulfilledTimestamp || a.timestamp,
      "desc",
    ),
    open: orderBy(open, (a) => a.timestamp, "desc"),
  };

  return wihdrawals;
}

export type GetVaultWithdrawalsAllChainsParameters = {
  account: Address;
  vaultKey?: Vault;
  rpcUrl?: string;
};

/**
 * Retrieves the withdrawals made by specified address across all supported chains for a vault.
 * This is useful for getting a complete view of all withdrawals regardless of the currently connected chain.
 *
 * @param parameters - The parameters.
 * @param parameters.account - The account address.
 * @param parameters.vaultKey - The optional vault identifier (defaults to Veda).
 * @param parameters.rpcUrl - The optional RPC url.
 *
 * @returns {Promise<VaultWithdrawals>} All withdrawals across all supported chains, categorized and sorted
 */
export async function getVaultWithdrawalsAllChains({
  account,
  vaultKey = Vault.Veda,
  rpcUrl,
}: GetVaultWithdrawalsAllChainsParameters): Promise<VaultWithdrawals> {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  // Fetch withdrawals from all supported chains in parallel
  const withdrawalsPromises = vault.chains.map((chainId) =>
    getVaultWithdrawals({ account, chainId, vaultKey, rpcUrl }).catch(
      (error) => {
        console.error(
          `Failed to fetch withdrawals for chain ${chainId}:`,
          error,
        );
        return {
          cancelled: [],
          expired: [],
          fulfilled: [],
          open: [],
        }; // Return empty withdrawals on error to not break the entire query
      },
    ),
  );

  const withdrawalsArrays = await Promise.all(withdrawalsPromises);

  // Combine all withdrawals from all chains
  const allCancelled: VaultWithdrawal[] = [];
  const allExpired: VaultWithdrawal[] = [];
  const allFulfilled: VaultWithdrawal[] = [];
  const allOpen: VaultWithdrawal[] = [];

  for (const withdrawals of withdrawalsArrays) {
    allCancelled.push(...withdrawals.cancelled);
    allExpired.push(...withdrawals.expired);
    allFulfilled.push(...withdrawals.fulfilled);
    allOpen.push(...withdrawals.open);
  }

  // Sort each category by timestamp (newest first)
  return {
    cancelled: orderBy(allCancelled, (a) => a.timestamp, "desc"),
    expired: orderBy(allExpired, (a) => a.timestamp, "desc"),
    fulfilled: orderBy(
      allFulfilled,
      (a) => a.fulfilledTimestamp || a.timestamp,
      "desc",
    ),
    open: orderBy(allOpen, (a) => a.timestamp, "desc"),
  };
}
