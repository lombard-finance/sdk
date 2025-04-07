import { Address, Hash } from 'viem';
import {
  isVedaVaultChain,
  Vault,
  VAULTS,
  VEDA_VAULT_CHAIN_TO_NETWORK_MAP,
} from '..';
import { ChainId } from '../../common/chains';
import {
  fromBaseDenomination,
  getAssetInfo,
  TokenInfo,
} from '../../tokens/tokens';
import BigNumber from 'bignumber.js';
import axios from 'axios';
import { orderBy, unique } from '../../utils/array';
import { ensureHex } from '../../utils/hex';

export type GetVaultWithdrawalsParameters = {
  account: Address;
  chainId: ChainId;
  vaultKey?: Vault;
  rpcUrl?: string;
};

export type VaultWithdrawal = {
  token?: Omit<TokenInfo, 'abi'>;
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

type Response = {
  Response: {
    cancelled_requests: WithdrawRequest[];
    expired_requests: WithdrawRequest[];
    fulfilled_requests: FulfilledRequest[];
    open_requests: WithdrawRequest[];
  };
};

const WITHDRAWALS_URL =
  'https://api.sevenseas.capital/withdrawRequests/{network}/{vault}/{account}?historical=true';

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
}: GetVaultWithdrawalsParameters) {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  if (!isVedaVaultChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(', ')}`,
    );
  }

  const network = VEDA_VAULT_CHAIN_TO_NETWORK_MAP[chainId];
  const url = WITHDRAWALS_URL.replace('{network}', network)
    .replace('{vault}', vault.vaultContract.address)
    .replace('{account}', account);

  const { data } = await axios.get<Response>(url);

  const withdrawAssetsAddresses = unique([
    ...data.Response.cancelled_requests.map(a => ensureHex(a.wantToken)),
    ...data.Response.expired_requests.map(a => ensureHex(a.wantToken)),
    ...data.Response.fulfilled_requests.map(a =>
      ensureHex(a.Request.wantToken),
    ),
    ...data.Response.open_requests.map(a => ensureHex(a.wantToken)),
  ]);

  const withdrawAssets: Record<Address, Omit<TokenInfo, 'abi'> | undefined> =
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

  const cancelled = data.Response.cancelled_requests.map(w => {
    const token = withdrawAssets[ensureHex(w.wantToken)];
    const withdrawal: VaultWithdrawal = {
      amount: undefined,
      blockNumber: w.blockNumber,
      deadline: w.deadline,
      shareAmount: fromBaseDenomination(w.amount, vault.decimals),
      timestamp: w.timestamp,
      txHash: ensureHex(w.transactionHash),
      token,
    };
    return withdrawal;
  });
  const expired = data.Response.expired_requests.map(w => {
    const token = withdrawAssets[ensureHex(w.wantToken)];
    const withdrawal: VaultWithdrawal = {
      amount: undefined,
      blockNumber: w.blockNumber,
      deadline: w.deadline,
      shareAmount: fromBaseDenomination(w.amount, vault.decimals),
      timestamp: w.timestamp,
      txHash: ensureHex(w.transactionHash),
      token,
    };
    return withdrawal;
  });
  const fulfilled = data.Response.fulfilled_requests.map(w => {
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
    };
    return withdrawal;
  });
  const open = data.Response.open_requests.map(w => {
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
    };
    return withdrawal;
  });

  const wihdrawals: VaultWithdrawals = {
    cancelled: orderBy(cancelled, a => a.timestamp, 'desc'),
    expired: orderBy(expired, a => a.timestamp, 'desc'),
    fulfilled: orderBy(
      fulfilled,
      a => a.fulfilledTimestamp || a.timestamp,
      'desc',
    ),
    open: orderBy(open, a => a.timestamp, 'desc'),
  };

  return wihdrawals;
}
