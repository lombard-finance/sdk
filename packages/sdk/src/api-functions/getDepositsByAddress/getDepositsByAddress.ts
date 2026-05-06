import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';

import { getApiConfig } from '../../common/api-config';
import { getChainIdByName } from '../../common/blockchain-identifier';
import {
  ChainId,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from '../../common/chains';
import { IEnvParam } from '../../common/parameters';
import {
  AddressKind,
  getTokenByAddress,
  Token,
} from '../../tokens/token-addresses';
import { fromBaseDenomination } from '../../tokens/tokens';
import { fetchAllPaginated } from '../../utils/pagination';
import { BTC_DECIMALS, fromSatoshi } from '../../utils/satoshi';

/** The default number of decimals for the deposit amount (value). */
const DECIMALS = BTC_DECIMALS;

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type Address = string;

/**
 * Enum representing the notarization status of a deposit transaction.
 */
export enum ENotarizationStatus {
  /** Status is unspecified or unknown */
  NOTARIZATION_STATUS_UNSPECIFIED = 'NOTARIZATION_STATUS_UNSPECIFIED',

  /** Initial status when a deposit transaction is created but not yet processed */
  NOTARIZATION_STATUS_PENDING = 'NOTARIZATION_STATUS_PENDING',

  /** Status when a deposit transaction is pending GMP processing */
  NOTARIZATION_STATUS_GMP_PENDING = 'NOTARIZATION_STATUS_GMP_PENDING',

  /** The deposit has been submitted for notarization */
  NOTARIZATION_STATUS_SUBMITTED = 'NOTARIZATION_STATUS_SUBMITTED',

  /** The notarization session was approved successfully */
  NOTARIZATION_STATUS_SESSION_APPROVED = 'NOTARIZATION_STATUS_SESSION_APPROVED',

  /** The notarization session failed */
  NOTARIZATION_STATUS_FAILED = 'NOTARIZATION_STATUS_FAILED',

  /** The notarization session was handled by GMP */
  NOTARIZATION_STATUS_GMP_HANDLED = 'NOTARIZATION_STATUS_GMP_HANDLED',
}

/**
 * Enum representing the state of a notarization session.
 */
export enum ESessionState {
  /** Session state is unspecified or unknown */
  SESSION_STATE_UNSPECIFIED = 'SESSION_STATE_UNSPECIFIED',

  /** Session is currently pending */
  SESSION_STATE_PENDING = 'SESSION_STATE_PENDING',

  /** Session has completed successfully */
  SESSION_STATE_COMPLETED = 'SESSION_STATE_COMPLETED',

  /** Session has expired without completion */
  SESSION_STATE_EXPIRED = 'SESSION_STATE_EXPIRED',
}

export interface NativeDeposit {
  /** Transaction hash on the source blockchain */
  tx_hash: string;

  /** Event index inside the transaction (for multi-event transactions) */
  event_index: number;

  /** Source blockchain identifier (e.g., BLOCKCHAIN_KATANA) */
  from_blockchain: string;

  /** Destination blockchain identifier */
  to_blockchain: string;

  /** Sender address on the source chain */
  from_address: string;

  /** Receiver address on the destination chain */
  to_address: string;

  /** Destination token contract address (if applicable) */
  to_token_address: string;

  /** Block height of the source chain confirmation */
  block_height: string;

  /** Block time of the source chain confirmation (ISO 8601) */
  block_time: string;

  /** Amount deposited (string to preserve precision) */
  amount: string;

  /** Hash of the payload that proves the deposit details */
  payload_hash: string;

  /** Raw payload bytes (hex-encoded) */
  raw_payload: string;

  /** Cryptographic proof (hex-encoded) */
  proof: string;

  /** ID of the notarization session linked to this deposit */
  session_id: string;

  /** Current notarization status of this deposit */
  notarization_status: ENotarizationStatus;

  /** Current session state of this deposit */
  session_state: ESessionState;

  /** Claim transaction hash on the destination chain, if claimed */
  claim_tx?: string;

  /** True if the deposit is sanctioned */
  sanctioned?: boolean;
}

/** Top-level response from the Native Deposits API */
export interface NativeDepositsResponse {
  /** List of native deposit records */
  deposits: NativeDeposit[];

  /** True if there are more deposits available */
  has_more: boolean;
}

export interface DirectDeposit {
  /** Transaction ID on the source chain */
  txid: string;

  /** Event index inside the transaction (useful for multi-event transactions) */
  index: string;

  /** Block height of the source chain confirmation */
  block_height: string;

  /** Amount deposited (string to preserve precision) */
  value: string;

  /** Destination address (EVM or BTC) */
  address: string;

  /** Hash of the payload proving the deposit */
  payload_hash: string;

  /** Raw payload bytes (hex-encoded) */
  raw_payload: string;

  /** Cryptographic proof (hex-encoded) */
  proof: string;

  /** Notarization session ID */
  session_id: string;

  /** Current notarization status */
  notarization_status: ENotarizationStatus;

  /** Current session state */
  session_state: ESessionState;

  /** Destination blockchain identifier */
  to_chain: string;

  /** Claim transaction hash on the destination chain, if claimed */
  claim_tx?: string;

  /** True if the deposit is sanctioned */
  sanctioned?: boolean;

  /** Block time of the source chain confirmation (timestamp as string) */
  block_time: string;

  /** Notarization wait duration (optional) */
  notarization_wait_dur?: string;

  /** Token address for the deposit */
  token_address?: string;

  /** Auxiliary version (if applicable) */
  aux_version?: number;

  /** Amount minted */
  token_amount?: string;

  /** GMP mint ID for solana LBTC GMP flow */
  mint_id?: string;
}

/** Top-level response from the Direct BTC Deposits API */
export interface DirectDepositsResponse {
  /** List of direct deposit records */
  outputs: DirectDeposit[];

  /** True if there are more deposits available */
  has_more: boolean;
}

/**
 * A unified deposit record returned from either
 * Direct BTC Deposits or Native Deposits APIs.
 */
export interface Deposit {
  /**
   * Whether this deposit originates from the Native Deposits API (EVM/alt-chain source).
   *
   * - `false` — Bitcoin mainnet direct deposit: the user sent BTC directly to a
   *   Lombard deposit address. This is the most common case for BTC stakers.
   * - `true`  — Native deposit: the deposit originated on an EVM or alt-chain
   *   (e.g. a chain using Lombard's native deposits flow).
   *
   * When polling for standard BTC deposit status, filter on `isNative === false`.
   *
   * @remarks A rename to a more descriptive field (e.g. `depositSource`) is
   * planned in a future major version to avoid confusion with "native BTC".
   */
  isNative: boolean;

  /** Transaction hash on the source blockchain. */
  txHash: string;

  /** Event index inside the transaction (Direct BTC uses output index). */
  eventIndex: number;

  /** Amount deposited (always normalized to satoshis/smallest unit). */
  amount: BigNumber;

  /** Amount minted (if applicable). */
  tokenAmount?: BigNumber;

  /** BTC address where the user deposited (direct BTC only). */
  depositAddress?: string;

  /** Sender address on the source chain (native only). */
  fromAddress?: string;

  /** Receiver address on the destination chain (if applicable). */
  toAddress?: string;

  /** Destination token contract (if applicable). */
  toTokenAddress?: string;

  /** Destination token (if applicable). */
  toToken?: Token;

  /** Destination chain identifier. */
  toChainId: ChainId | SuiChain | SolanaChain | StarknetChainId;

  /** Source chain identifier (native only). */
  fromChainId?: ChainId | SuiChain | SolanaChain | StarknetChainId;

  /** Block height where the deposit was confirmed (as a number). */
  blockHeight?: number;

  /**
   * Unix timestamp (seconds) of confirmation.
   * Converted from ISO8601 (native) or string epoch (direct BTC).
   */
  blockTime?: number;

  /** Hash of the payload proving the deposit details. */
  payloadHash?: string;

  /** Raw payload bytes (hex-encoded). */
  rawPayload?: string;

  /** Merkle/cryptographic proof (hex-encoded). */
  proof?: string;

  /** ID of the notarization session (string to preserve both APIs). */
  sessionId: string;

  /** Current notarization status. */
  notarizationStatus: ENotarizationStatus;

  /** Current session state. */
  sessionState: ESessionState;

  /** Claim transaction hash on the destination chain, if claimed. */
  claimTxHash?: string;

  /** True if the deposit was claimed (derived). */
  isClaimed: boolean;

  /** True if deposit is sanctioned (present in both APIs). */
  sanctioned?: boolean;

  /** Optional auxiliary version (direct BTC only). */
  auxVersion?: number;

  /** Optional wait duration for notarization (direct BTC only, in seconds). */
  notarizationWaitDur?: number;
}

export interface IGetDepositsByAddressParams extends IEnvParam {
  /**
   * The EVM address to get deposits for
   */
  address: Address;
}

/* -------------------------------------------------------------------------- */
/*                                Fetchers                                    */
/* -------------------------------------------------------------------------- */

/**
 * Fetches deposits from the Direct BTC Deposits API for a given address.
 *
 * Converts the API response into a unified `Deposit` format.
 *
 * @param {IGetDepositsByAddressParams} params - Parameters including address and environment
 * @param {string} params.address - The EVM/BTC address to fetch deposits for
 * @param {Env} params.env - The environment (e.g., 'mainnet', 'testnet')
 *
 * @returns {Promise<Deposit[]>} A list of direct BTC deposits in unified format
 *
 * @example
 * const directDeposits = await fetchDirectDeposits({ address: 'tb1q...', env: 'testnet' });
 */
export async function fetchDirectDeposits({
  address,
  env,
}: IGetDepositsByAddressParams): Promise<Deposit[]> {
  const { baseApiUrl } = getApiConfig(env);

  // pad address to 64 characters if needed
  if (address.startsWith('0x') && address.slice(2).length === 63) {
    address = `0x0${address.slice(2)}`;
  }

  const endpoint = new URL(`/api/v1/address/outputs-v2/${address}`, baseApiUrl);

  const outputs = await fetchAllPaginated({
    endpoint,
    extractItems: data => (data as DirectDepositsResponse)?.outputs ?? [],
  });

  return outputs.map(d => mapDirectBtcDeposit(d, env, address));
}

/**
 * Fetches deposits from the Native Deposits API for a given address.
 *
 * Converts the API response into a unified `Deposit` format.
 *
 * @param {IGetDepositsByAddressParams} params - Parameters including address and environment
 * @param {string} params.address - The EVM/BTC address to fetch deposits for
 * @param {Env} params.env - The environment (e.g., 'mainnet', 'testnet')
 *
 * @returns {Promise<Deposit[]>} A list of native deposits in unified format
 *
 * @example
 * const nativeDeposits = await fetchNativeDeposits({ address: 'tb1q...', env: 'testnet' });
 */
export async function fetchBTCbDeposits({
  address,
  env,
}: IGetDepositsByAddressParams): Promise<Deposit[]> {
  const { baseApiUrl } = getApiConfig(env);

  const endpoint = new URL(
    `/api/v1/address/native-deposits/${address}`,
    baseApiUrl,
  );

  const deposits = await fetchAllPaginated({
    endpoint,
    extractItems: data => (data as NativeDepositsResponse)?.deposits ?? [],
  });

  return deposits.map(d => mapBTCbDeposits(d, env));
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function mapDirectBtcDeposit(
  d: DirectDeposit,
  env?: Env,
  accountAddress?: string,
): Deposit {
  return {
    isNative: false,
    txHash: d.txid,
    eventIndex: d.index ? Number(d.index) : 0,
    amount: fromSatoshi(d.value),
    tokenAmount: d.token_amount
      ? fromBaseDenomination(d.token_amount, DECIMALS)
      : undefined,
    depositAddress: d.address,
    toAddress: accountAddress,
    toChainId: getChainIdByName(d.to_chain, env),
    blockHeight: d.block_height ? Number(d.block_height) : undefined,
    blockTime: d.block_time ? Number(d.block_time) : undefined, // epoch seconds
    payloadHash: d.payload_hash,
    rawPayload: d.raw_payload,
    proof: d.proof,
    sessionId: d.session_id,
    notarizationStatus: d.notarization_status,
    sessionState: d.session_state,
    claimTxHash: d.claim_tx,
    isClaimed: !!d.claim_tx,
    sanctioned: d.sanctioned,
    toTokenAddress: d.token_address,
    toToken: getTokenByAddress(
      d.token_address,
      getChainIdByName(d.to_chain, env),
      env,
      AddressKind.Adapter,
    ),
    auxVersion: d.aux_version,
    notarizationWaitDur: d.notarization_wait_dur
      ? Number(d.notarization_wait_dur)
      : undefined,
  };
}

function mapBTCbDeposits(d: NativeDeposit, env?: Env): Deposit {
  return {
    isNative: true,
    txHash: d.tx_hash,
    eventIndex: d.event_index,
    amount: fromBaseDenomination(d.amount, DECIMALS),
    tokenAmount: undefined,
    fromAddress: d.from_address,
    toAddress: d.to_address,
    toTokenAddress: d.to_token_address,
    toToken: getTokenByAddress(
      d.to_token_address,
      getChainIdByName(d.to_blockchain, env),
      env,
      AddressKind.Adapter,
    ),
    toChainId: getChainIdByName(d.to_blockchain, env),
    fromChainId: getChainIdByName(d.from_blockchain, env),
    blockHeight: d.block_height ? Number(d.block_height) : undefined,
    blockTime: d.block_time
      ? Math.floor(new Date(d.block_time).getTime() / 1000) // seconds
      : undefined,
    payloadHash: d.payload_hash,
    rawPayload: d.raw_payload,
    proof: d.proof,
    sessionId: d.session_id,
    notarizationStatus: d.notarization_status,
    sessionState: d.session_state,
    claimTxHash: d.claim_tx,
    isClaimed: !!d.claim_tx,
    sanctioned: d.sanctioned,
  };
}

/* -------------------------------------------------------------------------- */
/*                               Public API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fetches all deposits for a given address from both Direct BTC Deposits
 * and Native Deposits APIs, unifying them into a single list.
 *
 * Both APIs are called concurrently. If one API fails, the other still returns results.
 *
 * Deposits are returned sorted by `blockTime` descending (newest first).
 *
 * @param {IGetDepositsByAddressParams} params - Parameters including the address and environment
 * @param {string} params.address - The EVM/BTC address to fetch deposits for
 * @param {Env} params.env - The environment (e.g., 'mainnet', 'testnet')
 *
 * @returns {Promise<Deposit[]>} A unified list of deposits from both APIs
 *
 * @example
 * const deposits = await getDepositsByAddress({ address: 'tb1q...', env: 'testnet' });
 * console.log(deposits);
 */
export async function getDepositsByAddress({
  address,
  env,
}: IGetDepositsByAddressParams): Promise<Deposit[]> {
  const results = await Promise.allSettled([
    fetchDirectDeposits({ address, env }),
    fetchBTCbDeposits({ address, env }),
  ]);

  let directDeposits: Deposit[] = [];
  let nativeDeposits: Deposit[] = [];

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      if (idx === 0)
        directDeposits = result.value; // Direct BTC deposits
      else nativeDeposits = result.value; // Native deposits
    } else {
      console.error(
        idx === 0
          ? 'Failed to fetch direct BTC deposits:'
          : 'Failed to fetch native deposits:',
        result.reason,
      );
    }
  });

  const allDeposits = [...directDeposits, ...nativeDeposits].sort((a, b) => {
    const aTime = a.blockTime ?? 0;
    const bTime = b.blockTime ?? 0;
    return bTime - aTime;
  });

  return allDeposits;
}
