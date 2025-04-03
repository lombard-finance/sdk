import {
  isVedaVaultChain,
  NETWORK_TO_VEDA_VAULT_CHAIN_MAP,
  Vault,
  VAULTS,
  VEDA_VAULT_CHAIN_TO_NETWORK_MAP,
  VedaVaultChain,
} from "..";
import axios from "axios";
import BigNumber from "bignumber.js";
import { ensureHex } from "../../utils/hex";
import { orderBy } from "../../utils/array";
import { TChainId } from "../../common/types/types";
import { fromSatoshi } from "../../common/utils/convertSatoshi";

type Address = `0x${string}`;
type Hash = `0x${string}`;

const DEPOSITS_URL =
  "https://api.sevenseas.capital/deposits/{network}/{vault}/{account}";

export type GetVaultDepositsParameters = {
  account: Address;
  chainId: TChainId;
  vaultKey?: Vault;
};

type ResponseEntry = {
  block_number: number;
  chain: string;
  deposit_amount: number;
  deposit_asset: string;
  share_amount: number;
  tx_hash: string;
  user: string;
  vault_address: string;
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
  token?: string;
};

/**
 * Retrieves the deposits made by specified address.
 * @param parameters - The parameters.
 * @param parameters.account - The account address.
 * @param parameters.chainId - The chain id.
 * @param parameters.vaultKey - The optional vault identifier.
 *
 * @returns {Promise<VaultDeposit[]>}
 */
export async function getVaultDeposits({
  account,
  chainId,
  vaultKey = Vault.Veda,
}: GetVaultDepositsParameters) {
  const vault = VAULTS[vaultKey];
  if (!vault) {
    throw new Error(`Unknown vault key: ${vaultKey}`);
  }

  if (!isVedaVaultChain(chainId)) {
    throw new Error(
      `Unsupported chain id: ${chainId}. Please switch to one of the supported chains: ${vault.chains.join(", ")}`
    );
  }

  const network = VEDA_VAULT_CHAIN_TO_NETWORK_MAP[chainId];
  const url = DEPOSITS_URL.replace("{network}", network)
    .replace("{vault}", vault.vaultContract.address)
    .replace("{account}", account);

  const { data } = await axios.get<ResponseEntry[]>(url);

  const deposits = data.map((d) => {
    const token = ensureHex(d.deposit_asset);
    const amount = fromSatoshi(d.deposit_amount);
    const shareAmount = fromSatoshi(d.share_amount);

    const vaultDeposit: VaultDeposit = {
      txHash: ensureHex(d.tx_hash),
      blockNumber: d.block_number,
      chainId: NETWORK_TO_VEDA_VAULT_CHAIN_MAP[d.chain],
      amount,
      shareAmount,
      token,
    };

    return vaultDeposit;
  });

  return orderBy(deposits, (d) => d.blockNumber, "desc");
}
