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
  isEarnChain,
  NETWORK_TO_EARN_CHAIN_MAP,
} from '../config';

type SevenSeasDepositEntry = {
  block_number: number;
  chain: string;
  deposit_amount: number;
  deposit_asset: string;
  share_amount: number;
  tx_hash: string;
  user: string;
  vault_address: string;
};

type SevenSeasDepositsPayload =
  | SevenSeasDepositEntry
  | SevenSeasDepositEntry[]
  | { Response: SevenSeasDepositEntry }
  | { Response: SevenSeasDepositEntry[] };

const normalizeSevenSeasDeposits = (
  payload: SevenSeasDepositsPayload | undefined,
): SevenSeasDepositEntry[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if ('Response' in payload) {
    const response = payload.Response;
    if (Array.isArray(response)) {
      return response;
    }
    if (response) {
      return [response];
    }
    return [];
  }

  return [payload];
};

export type GetEarnDepositsParameters = IEnvParam & {
  account: Address;
  chainId: ChainId;
  rpcUrl?: string;
};

export type EarnDeposit = {
  /** The transaction hash */
  txHash: Hash;
  /** The transaction's block number */
  blockNumber: number;
  /** The chain id */
  chainId: EarnChain;
  /** The deposited amount */
  amount: BigNumber;
  /** The amount of shares received */
  shareAmount: BigNumber;
  /** The deposit token */
  token?: Omit<TokenInfo, 'abi'>;
  /** The user wallet address that made the deposit */
  toAddress: Address;
};

/**
 * Retrieves the deposits made by specified address.
 * @param parameters - The parameters.
 * @param parameters.account - The account address.
 * @param parameters.chainId - The chain id.
 * @param parameters.rpcUrl - The optional RPC url.
 *
 * @returns {Promise<EarnDeposit[]>}
 */
export async function getEarnDeposits({
  auth,
  account,
  chainId,
  rpcUrl,
  env,
}: GetEarnDepositsParameters) {
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
  const url = `${bffApiUrl}/sevenseas-api/deposits/${network}/${vault.vaultContract.address}/${account}`;

  const { data } = await httpRequest<SevenSeasDepositsPayload>({
    url: url,
    scope: 'userScoped',
    auth,
  });
  const entries = normalizeSevenSeasDeposits(data);

  const depositAssetsAddresses = unique(
    entries.map((d) => ensureHex(d.deposit_asset)),
  );

  const depositAssets: Record<Address, Omit<TokenInfo, 'abi'> | undefined> = {};
  for (const asset of depositAssetsAddresses) {
    const assetInfo = await getAssetInfo(asset, chainId, rpcUrl, env);
    if (assetInfo) {
      depositAssets[asset] = {
        address: assetInfo.address,
        decimals: assetInfo.decimals,
        symbol: assetInfo.symbol,
      };
    } else {
      depositAssets[asset] = undefined;
    }
  }

  const deposits = entries.map((d) => {
    const token = depositAssets[ensureHex(d.deposit_asset)];
    const amount = fromBaseDenomination(d.deposit_amount, token?.decimals || 0);
    const shareAmount = fromBaseDenomination(d.share_amount, vault.decimals);

    const vaultDeposit: EarnDeposit = {
      txHash: ensureHex(d.tx_hash),
      blockNumber: d.block_number,
      chainId: NETWORK_TO_EARN_CHAIN_MAP[d.chain],
      amount,
      shareAmount,
      token,
      toAddress: ensureHex(d.user),
    };

    return vaultDeposit;
  });

  return orderBy(deposits, (d) => d.blockNumber, 'desc');
}

export type GetEarnDepositsAllChainsParameters = IEnvParam & {
  account: Address;
  rpcUrl?: string;
};

/**
 * Retrieves the deposits made by specified address across all supported chains for a vault.
 * This is useful for getting a complete view of all deposits regardless of the currently connected chain.
 *
 * @param parameters - The parameters.
 * @param parameters.account - The account address.
 * @param parameters.rpcUrl - The optional RPC url.
 * @param parameters.env - The optional environment identifier.
 *
 * @returns {Promise<EarnDeposit[]>} All deposits across all supported chains, sorted by block number (newest first)
 */
export async function getEarnDepositsAllChains({
  account,
  rpcUrl,
  env,
  // Same as the withdrawals op beside this one: the per-chain read is
  // user-scoped and refuses before sending without a token, and `auth` arrives
  // inside `IEnvParam` so dropping it type-checks.
  auth,
}: GetEarnDepositsAllChainsParameters): Promise<EarnDeposit[]> {
  const vault = EARN_VAULT;
  // Fetch deposits from all supported chains in parallel
  const depositsPromises = vault.chains.map((chainId: EarnChain) =>
    getEarnDeposits({ account, chainId, rpcUrl, env, auth }).catch(
      (error: unknown) => {
        console.error(`Failed to fetch deposits for chain ${chainId}:`, error);
        return []; // Return empty array on error to not break the entire query
      },
    ),
  );

  const depositsArrays = await Promise.all(depositsPromises);

  // Flatten and sort all deposits by block number (newest first)
  const allDeposits = depositsArrays.flat();
  return orderBy(allDeposits, (d) => d.blockNumber, 'desc');
}
