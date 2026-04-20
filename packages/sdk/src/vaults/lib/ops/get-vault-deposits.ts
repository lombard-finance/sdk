import axios from 'axios';
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
import {
  isVedaVaultChain,
  NETWORK_TO_VEDA_VAULT_CHAIN_MAP,
  Vault,
  VAULTS,
  VEDA_VAULT_CHAIN_TO_NETWORK_MAP,
  VedaVaultChain,
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

export type GetVaultDepositsParameters = IEnvParam & {
  account: Address;
  chainId: ChainId;
  vaultKey?: Vault;
  rpcUrl?: string;
};

export type VaultDeposit = {
  /** The transaction hash */
  txHash: Hash;
  /** The transaction's block number */
  blockNumber: number;
  /** The chain id */
  chainId: VedaVaultChain;
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
 * @param parameters.vaultKey - The optional vault identifier.
 * @param parameters.rpcUrl - The optional RPC url.
 *
 * @returns {Promise<VaultDeposit[]>}
 */
export async function getVaultDeposits({
  account,
  chainId,
  vaultKey = Vault.Veda,
  rpcUrl,
  env,
}: GetVaultDepositsParameters) {
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
  const { bffApiUrl } = getApiConfig(env);
  if (!bffApiUrl) {
    throw new Error(
      `Could not determine API endpoint for provided environment: ${env}`,
    );
  }
  const url = `${bffApiUrl}/sevenseas-api/deposits/${network}/${vault.vaultContract.address}/${account}`;

  const { data } = await axios.get<SevenSeasDepositsPayload>(url);
  const entries = normalizeSevenSeasDeposits(data);

  const depositAssetsAddresses = unique(
    entries.map(d => ensureHex(d.deposit_asset)),
  );

  const depositAssets: Record<Address, Omit<TokenInfo, 'abi'> | undefined> = {};
  for (const asset of depositAssetsAddresses) {
    const assetInfo = await getAssetInfo(asset, chainId, rpcUrl);
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

  const deposits = entries.map(d => {
    const token = depositAssets[ensureHex(d.deposit_asset)];
    const amount = fromBaseDenomination(d.deposit_amount, token?.decimals || 0);
    const shareAmount = fromBaseDenomination(d.share_amount, vault.decimals);

    const vaultDeposit: VaultDeposit = {
      txHash: ensureHex(d.tx_hash),
      blockNumber: d.block_number,
      chainId: NETWORK_TO_VEDA_VAULT_CHAIN_MAP[d.chain],
      amount,
      shareAmount,
      token,
      toAddress: ensureHex(d.user),
    };

    return vaultDeposit;
  });

  return orderBy(deposits, d => d.blockNumber, 'desc');
}

export type GetVaultDepositsAllChainsParameters = {
  account: Address;
  vaultKey?: Vault;
  rpcUrl?: string;
};

/**
 * Retrieves the deposits made by specified address across all supported chains for a vault.
 * This is useful for getting a complete view of all deposits regardless of the currently connected chain.
 *
 * @param parameters - The parameters.
 * @param parameters.account - The account address.
 * @param parameters.vaultKey - The optional vault identifier (defaults to Veda).
 * @param parameters.rpcUrl - The optional RPC url.
 *
 * @returns {Promise<VaultDeposit[]>} All deposits across all supported chains, sorted by block number (newest first)
 */
export async function getVaultDepositsAllChains({
  account,
  vaultKey = Vault.Veda,
  rpcUrl,
}: GetVaultDepositsAllChainsParameters): Promise<VaultDeposit[]> {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  // Fetch deposits from all supported chains in parallel
  const depositsPromises = vault.chains.map(chainId =>
    getVaultDeposits({ account, chainId, vaultKey, rpcUrl }).catch(error => {
      console.error(`Failed to fetch deposits for chain ${chainId}:`, error);
      return []; // Return empty array on error to not break the entire query
    }),
  );

  const depositsArrays = await Promise.all(depositsPromises);

  // Flatten and sort all deposits by block number (newest first)
  const allDeposits = depositsArrays.flat();
  return orderBy(allDeposits, d => d.blockNumber, 'desc');
}
