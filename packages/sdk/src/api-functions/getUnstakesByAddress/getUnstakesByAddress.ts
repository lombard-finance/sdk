import { DEFAULT_ENV } from "@lombard.finance/sdk-common";
import BigNumber from "bignumber.js";
import * as bitcoin from "bitcoinjs-lib";
import { Hex, trim } from "viem";

import { getApiConfig } from "../../common/api-config";
import {
  BlockchainIdentifier,
  getChainIdByName,
} from "../../common/blockchain-identifier";
import {
  ChainId,
  isSolanaChain,
  isStarknetChainId,
  isSuiChain,
  isValidChain,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from "../../common/chains";
import { IEnvParam } from "../../common/parameters";
import {
  AddressKind,
  getSolanaTokenAddress,
  getStarknetTokenAddress,
  getSuiTokenAddress,
  Token,
  TOKEN_ADDRESSES,
} from "../../tokens/token-addresses";
import { fetchAllPaginated } from "../../utils/pagination";
import { fromSatoshi } from "../../utils/satoshi";
import {
  ENotarizationStatus,
  ESessionState,
} from "../getDepositsByAddress/getDepositsByAddress";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/**
 * Status of a payout transaction corresponding to an unstake.
 */
export enum PayoutTxStatus {
  /** The payout transaction has been sent; unstake completed */
  Completed = "Completed",

  /** The payout transaction has not been sent; unstake pending */
  Pending = "Pending",
}

/**
 * Response object for a single unstake record from the API.
 */
interface UnstakeEntry {
  /** Transaction hash of the unstake on the source blockchain. */
  tx_hash: string;

  /** Source blockchain identifier (e.g., BLOCKCHAIN_BSC, BLOCKCHAIN_ETHEREUM). */
  blockchain: BlockchainIdentifier;

  /** Block height where the unstake was confirmed. */
  block_height: string;

  /** Block time of the unstake transaction (as a string timestamp). */
  block_time: string;

  /** Address of the initiator of the unstake. */
  from_address: string;

  /** Destination address for the payout. */
  to_address?: string;

  /** Destination blockchain identifier for the payout. */
  to_chain?: string;

  /** Output script used to derive BTC address, present for BTC unstakes. */
  output_script?: string;

  /** Amount unstaked (string to preserve precision). */
  amount: string;

  /** Payout transaction hash on the destination chain, if already completed. */
  payout_txid?: string;

  /** Index of the payout transaction, if applicable. */
  payout_index?: string;

  /** True if the unstake transaction has been sanctioned or flagged as suspicious. */
  sanctioned?: boolean;

  /** Cryptographic proof (hex-encoded) */
  proof?: string;

  /** Raw payload bytes (hex-encoded) */
  payload?: string;

  /** Current notarization status (for native chain redemptions) */
  notarization_status?: ENotarizationStatus;

  /** Current session state (for native chain redemptions) */
  session_state?: ESessionState;

  /** Claim transaction hash on the destination chain, if claimed (for native chain redemptions) */
  claim_tx?: string;

  /** Token address on the source chain */
  from_token_address?: string;
}

/**
 * Top-level API response for unstakes.
 */
interface UnstakesResponse {
  unstakes?: UnstakeEntry[];

  /** True if there are more unstakes available */
  has_more: boolean;
}

/**
 * Parameters for fetching unstakes by address.
 */
export interface IGetUnstakesByAddressParameters extends IEnvParam {
  /** Address of the unstake initiator */
  address: string;

  /** Optional filtering */
  options?: {
    /** Show only direct BTC unstakes */
    show_unstakes?: boolean;
    /** Show only native chain redemptions */
    show_redeems?: boolean;
    /** Show only redeems to native chain (LBTC -> BTC.b) */
    to_native?: boolean;
  };
}

/**
 * A unified unstake record returned from either
 * direct BTC unstakes or native blockchain redemptions.
 */
export interface Unstake {
  /** True if the record originates from the native blockchain redemption. */
  isNative: boolean;

  /** Transaction hash of the unstake. */
  txHash: string;

  /** Source chain identifier (where the unstake originated). */
  fromChainId: ChainId | SuiChain | SolanaChain | StarknetChainId;

  /** Destination chain identifier (undefined for BTC unstakes). */
  toChainId?: ChainId | SuiChain | SolanaChain | StarknetChainId | "bitcoin";

  /** Block height where the unstake was confirmed. */
  blockHeight: number;

  /** Block time (as epoch seconds) of the unstake. */
  blockTime: number;

  /** Initiator of the unstake transaction. */
  fromAddress: string;

  /** Destination address (BTC, EVM, or Solana). */
  toAddress?: string;

  /** Amount unstaked (normalized to satoshis / smallest unit). */
  amount: BigNumber;

  /** Payout transaction hash on the destination chain, if claimed. */
  payoutTxHash?: string;

  /** Payout transaction index, if applicable. */
  payoutTxIndex?: number;

  /** Status of the payout transaction. */
  payoutTxStatus: PayoutTxStatus;

  /** True if the unstake transaction has been sanctioned. */
  sanctioned?: boolean;

  /** Raw payload bytes (hex-encoded). */
  rawPayload?: string;

  /** Merkle/cryptographic proof (hex-encoded). */
  proof?: string;

  /** The output token. */
  toToken?: Token;

  /** The output token address. */
  toTokenAddress?: string;

  /** Current notarization status (for native chain redemptions). */
  notarizationStatus?: ENotarizationStatus;

  /** Current session state (for native chain redemptions). */
  sessionState?: ESessionState;

  /** Claim transaction hash on the destination chain, if claimed (for native chain redemptions). */
  claimTxHash?: string;

  /** Token address on the source chain */
  fromTokenAddress?: string;
}

/* -------------------------------------------------------------------------- */
/*                                Fetchers                                    */
/* -------------------------------------------------------------------------- */

/**
 * Fetches all unstakes initiated by a given address.
 *
 * @param {IGetUnstakesByAddressParameters} params - Parameters for fetching unstakes.
 * @param {string} params.address - Address of the unstake initiator.
 * @param {Env} [params.env='prod'] - Environment to use (prod/testnet).
 * @param {object} [params.options] - Optional pagination and filter options.
 *
 * @returns {Promise<Unstake[]>} - List of mapped unstakes.
 *
 * @throws {Error} - Throws if no address is specified.
 */
export async function fetchUnstakesByAddress({
  address,
  env = DEFAULT_ENV,
  options,
}: IGetUnstakesByAddressParameters): Promise<Unstake[]> {
  if (!address) throw new Error("No address specified.");

  const { baseApiUrl } = getApiConfig(env);

  // pad address to 64 characters if needed
  if (address.startsWith("0x") && address.slice(2).length === 63) {
    address = `0x0${address.slice(2)}`;
  }

  const endpoint = new URL(`/api/v1/address/unstakes/${address}`, baseApiUrl);

  const unstakes = await fetchAllPaginated({
    endpoint,
    extractItems: (data) => (data as UnstakesResponse)?.unstakes ?? [],
    query: {
      show_redeems: options?.show_redeems ? "true" : undefined,
      show_unstakes: options?.show_unstakes ? "true" : undefined,
      to_native: options?.to_native ? "true" : undefined,
    },
  });

  return unstakes.map((d) => mapUnstakeEntry(d, env));
}

/* -------------------------------------------------------------------------- */
/*                                 Helpers                                    */
/* -------------------------------------------------------------------------- */

/**
 * Maps a raw API unstake response to the unified `Unstake` object.
 *
 * @param {UnstakeEntry} d - Raw unstake data from API
 * @param {Env} env - Environment to use for chain/network resolution
 *
 * @returns {Unstake} - Unified unstake object
 */
function mapUnstakeEntry(
  d: UnstakeEntry,
  env: IEnvParam["env"] = DEFAULT_ENV,
): Unstake {
  const isNative = Boolean(d.to_chain && d.to_address);

  let toAddress: string | undefined = d.to_address;
  if (!isNative && d.output_script) {
    try {
      toAddress = bitcoin.address.fromOutputScript(
        Buffer.from(d.output_script.replace(/^0x/, ""), "hex"),
        env === "prod" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet,
      );
    } catch {
      toAddress = undefined;
    }
  } else if (toAddress?.startsWith("0x")) {
    toAddress = trim(toAddress as Hex);
  }

  const payoutTxStatus = d.payout_txid
    ? PayoutTxStatus.Completed
    : PayoutTxStatus.Pending;

  const toToken = isNative ? Token.BTCb : undefined;
  const toChainId = d.to_chain
    ? d.to_chain === BlockchainIdentifier.bitcoin ||
      d.to_chain === BlockchainIdentifier.bitcoinOld
      ? "bitcoin"
      : getChainIdByName(d.to_chain, env)
    : undefined;

  let toTokenAddress: string | undefined = undefined;
  if (toToken) {
    if (isValidChain(toChainId)) {
      let address = TOKEN_ADDRESSES?.[toToken]?.[env]?.[toChainId];
      if (address) {
        address =
          typeof address === "string" ? address : address[AddressKind.Adapter];
      }
      toTokenAddress = address;
    }

    if (isSolanaChain(toChainId)) {
      toTokenAddress = getSolanaTokenAddress(toChainId, env);
    }

    if (isSuiChain(toChainId)) {
      toTokenAddress = getSuiTokenAddress(toChainId, env);
    }

    if (isStarknetChainId(toChainId)) {
      toTokenAddress = getStarknetTokenAddress(toChainId, env);
    }
  }

  return {
    isNative,
    txHash: d.tx_hash,
    fromChainId: getChainIdByName(d.blockchain, env),
    toChainId,
    blockHeight: Number(d.block_height),
    blockTime: Number(d.block_time),
    fromAddress: d.from_address,
    toAddress,
    amount: fromSatoshi(d.amount),
    payoutTxHash: d.payout_txid,
    payoutTxIndex: d.payout_index ? Number(d.payout_index) : undefined,
    payoutTxStatus,
    sanctioned: d.sanctioned,
    proof: d.proof,
    rawPayload: d.payload,
    toToken,
    toTokenAddress,
    notarizationStatus: d.notarization_status,
    sessionState: d.session_state,
    claimTxHash: d.claim_tx,
    fromTokenAddress: d.from_token_address,
  };
}

/* -------------------------------------------------------------------------- */
/*                               Public API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Returns all unstakes (direct BTC or native chain redemptions) for a given address.
 *
 * @param {IGetUnstakesByAddressParameters} params - Parameters for fetching unstakes.
 * @param {string} params.address - Address of the unstake initiator.
 * @param {Env} [params.env=DEFAULT_ENV] - Environment to use.
 * @param {object} [params.options] - Optional pagination and filter options.
 *
 * @returns {Promise<Unstake[]>} - Array of unified unstake records.
 *
 * @throws {Error} - Throws if no address is specified.
 */
export async function getUnstakesByAddress({
  address,
  env = DEFAULT_ENV,
  options,
}: IGetUnstakesByAddressParameters): Promise<Unstake[]> {
  return fetchUnstakesByAddress({ address, env, options });
}
