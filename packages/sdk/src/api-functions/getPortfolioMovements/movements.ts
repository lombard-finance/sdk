import { Env } from '@lombard.finance/sdk-common';
import BigNumber from 'bignumber.js';
import { getAddress } from 'viem';

import { getChainIdByName } from '../../common/blockchain-identifier';
import {
  ChainId,
  SolanaChain,
  StarknetChainId,
  SuiChain,
} from '../../common/chains';
import {
  AddressKind,
  getTokenByAddress,
  Token,
} from '../../tokens/token-addresses';
import { fromBaseDenomination } from '../../tokens/tokens';
import { BTC_DECIMALS } from '../../utils/satoshi';
import {
  type Deposit,
  ENotarizationStatus,
  ESessionState,
} from '../getDepositsByAddress/getDepositsByAddress';
import {
  PayoutTxStatus,
  type Unstake,
} from '../getUnstakesByAddress/getUnstakesByAddress';

/**
 * The `/v2/portfolio/{address}/{deposits,withdrawals,bridges}` record and its
 * conversion into the SDK's `Deposit`, `Unstake` and {@link PortfolioBridge}.
 *
 * Every list returns the same `Movement`: a source leg, a destination leg, a
 * status, and the claim and notarization data where they exist. The mappers
 * here produce the shapes the v1 readers return, so a consumer can switch
 * source without touching what it renders.
 *
 * @module api-functions/getPortfolioMovements/movements
 */

/* -------------------------------------------------------------------------- */
/*                                Wire types                                  */
/* -------------------------------------------------------------------------- */

export type MovementType =
  | 'MOVEMENT_TYPE_UNSPECIFIED'
  | 'MOVEMENT_TYPE_DEPOSIT_NATIVE'
  | 'MOVEMENT_TYPE_DEPOSIT_BTCB'
  | 'MOVEMENT_TYPE_REDEEM_NATIVE'
  | 'MOVEMENT_TYPE_REDEEM_LBTC'
  | 'MOVEMENT_TYPE_BRIDGE';

export type MovementStatus =
  | 'MOVEMENT_STATUS_UNSPECIFIED'
  | 'MOVEMENT_STATUS_FAILED'
  | 'MOVEMENT_STATUS_SANCTIONED'
  | 'MOVEMENT_STATUS_PENDING'
  | 'MOVEMENT_STATUS_RELAYING'
  | 'MOVEMENT_STATUS_CONFIRMED'
  | 'MOVEMENT_STATUS_NOTARIZED'
  | 'MOVEMENT_STATUS_CLAIMABLE'
  | 'MOVEMENT_STATUS_COMPLETED';

export interface MovementLeg {
  chain?: string;
  address?: string;
  /** Base units as an integer string. */
  amount?: string;
  asset?: {
    address?: string;
    decimals?: number | string;
    /** `lbtc` / `btcb` on the wire, `ASSET_TYPE_LBTC` / `ASSET_TYPE_BTCB` in the schema. */
    asset_type?: string;
  };
  transaction_id?: string;
  transaction_index?: number | string;
  /** 64-bit integers arrive as JSON strings. Unset until the tx is mined. */
  block_height?: number | string;
  /** ISO 8601 in the schema. Epoch seconds, as a number or a string, are read too. */
  block_time?: number | string;
}

export interface Movement {
  id?: string;
  type?: MovementType | string;
  source?: MovementLeg;
  destination?: MovementLeg;
  status?: MovementStatus | string;
  claim_data?: { payload_hash?: string; raw_payload?: string; proof?: string };
  notarization_data?: {
    session_id?: string;
    notarization_status?: string;
    ledger_tx_hash?: string;
  };
}

/** A bridge transfer between two chains, from `/v2/portfolio/{address}/bridges`. */
export interface PortfolioBridge {
  /** The transfer's transaction on the source chain. */
  txHash: string;
  /** Unix seconds of the source transaction, when known. */
  blockTime?: number;
  /** Amount sent, scaled to the asset's decimals. */
  amount: BigNumber;
  fromAddress?: string;
  toAddress?: string;
  fromChainId?: AnyChainId;
  toChainId?: AnyChainId;
  /** The bridged token's contract on the source chain. */
  tokenAddress?: string;
  /** The delivering transaction on the destination chain, once it exists. */
  destinationTxHash?: string;
  status?: MovementStatus;
}

export type AnyChainId = ChainId | SuiChain | SolanaChain | StarknetChainId;

/** `/v2/chains`: network family name to that environment's chain id. */
export type ChainIdsByFamily = ReadonlyMap<string, string>;

/* -------------------------------------------------------------------------- */
/*                                Normalising                                 */
/* -------------------------------------------------------------------------- */

/**
 * The gateway writes every v2 enum as its short lowercase name (`completed`,
 * `deposit_native`) while the published schema lists the full names. Accept
 * both and hand the mappers the full name.
 */
function toFullEnumName<T extends string>(
  value: string | undefined,
  prefix: string,
): T | undefined {
  if (!value) return undefined;
  const name = value.trim().toUpperCase().replace(/-/g, '_');
  return (name.startsWith(prefix) ? name : `${prefix}${name}`) as T;
}

export function normalizeMovement(movement: Movement): Movement {
  return {
    ...movement,
    type: toFullEnumName<MovementType>(movement.type, 'MOVEMENT_TYPE_'),
    status: toFullEnumName<MovementStatus>(movement.status, 'MOVEMENT_STATUS_'),
  };
}

/**
 * Chains arrive as `base`, `base_sepolia` or `BLOCKCHAIN_BASE_SEPOLIA`
 * depending on the route. Reduce each to its network family and let the
 * environment pick mainnet or testnet, as the v1 readers did.
 */
const TESTNET_SUFFIX =
  /_(sepolia|testnet|fuji|devnet|tatara|signet|holesky|bartio|blaze|gastald|bft|ibc)$/;

export function getMovementChainFamily(chain?: string): string | undefined {
  if (!chain) return undefined;
  const family = chain
    .toLowerCase()
    .replace(/^(destination_)?blockchain_/, '')
    .replace(TESTNET_SUFFIX, '');
  return family && family !== 'unknown' && family !== 'unspecified'
    ? family
    : undefined;
}

/**
 * `getChainIdByName` falls back to Ethereum mainnet for a name it does not
 * know. Only these families go through it, so an unexpected chain resolves to
 * `undefined` rather than to the wrong network.
 */
const NAMED_CHAIN_FAMILIES = new Set([
  'ethereum',
  'avalanche',
  'base',
  'bsc',
  'katana',
  'sui',
  'sonic',
  'solana',
  'starknet',
  'monad',
  'stable',
  'megaeth',
]);

/**
 * @param chainIdsByFamily - The gateway's own chain list, for families the
 *   SDK does not name. Numeric chain ids only.
 */
export function getMovementChainId(
  chain: string | undefined,
  env: Env | undefined,
  chainIdsByFamily?: ChainIdsByFamily,
): AnyChainId | 'bitcoin' | undefined {
  const family = getMovementChainFamily(chain);
  if (!family) return undefined;
  if (family === 'bitcoin') return 'bitcoin';
  if (NAMED_CHAIN_FAMILIES.has(family)) {
    return getChainIdByName(`BLOCKCHAIN_${family.toUpperCase()}`, env);
  }
  const chainId = chainIdsByFamily?.get(family);
  return chainId && /^\d+$/.test(chainId)
    ? (Number(chainId) as ChainId)
    : undefined;
}

/**
 * Amounts are base-unit integer strings. A decimal string is read as already
 * scaled, so a schema change to decimals cannot inflate a balance by 10^8.
 */
export function parseMovementAmount(leg?: MovementLeg): BigNumber {
  const raw = leg?.amount;
  if (!raw) return new BigNumber(0);
  if (raw.includes('.')) return new BigNumber(raw);
  const decimals = Number(leg?.asset?.decimals ?? BTC_DECIMALS) || BTC_DECIMALS;
  return fromBaseDenomination(raw, decimals);
}

/** Above this an epoch value cannot be seconds (year 33658), so it is milliseconds. */
const MAX_EPOCH_SECONDS = 1e12;

/**
 * Unix seconds for a leg's `block_time`. The schema gives ISO 8601; epoch
 * seconds are read too, as a number or a numeric string, and epoch
 * milliseconds where the value is too large to be seconds. Anything else is
 * dropped.
 */
export function toEpochSeconds(time?: number | string): number | undefined {
  if (typeof time === 'number') return fromEpoch(time);
  // A JSON `null`, or anything else that is not a string, is dropped too.
  if (typeof time !== 'string') return undefined;
  if (/^\d+(\.\d+)?$/.test(time.trim())) return fromEpoch(Number(time));
  const ms = new Date(time).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
}

function fromEpoch(epoch: number): number | undefined {
  if (!Number.isFinite(epoch) || epoch < 0) return undefined;
  return Math.floor(epoch > MAX_EPOCH_SECONDS ? epoch / 1000 : epoch);
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
/** A 20-byte address left-padded to a 32-byte word. */
const PADDED_EVM_ADDRESS = /^0x0{24}([0-9a-fA-F]{40})$/;

/**
 * An EVM address in the form the v1 readers return: 20 bytes, EIP-55
 * checksummed. `/withdrawals` can send an EVM destination as a 32-byte word,
 * the address left-padded with zeros, which v1 trimmed. A value that is
 * neither form is returned as it came.
 *
 * Only for addresses on an EVM chain: Starknet and Sui addresses are 32-byte
 * values that may legitimately start with zeros.
 */
export function toEvmAddress(value: string): string {
  const unpadded = PADDED_EVM_ADDRESS.exec(value);
  const address = unpadded ? `0x${unpadded[1]}` : value;
  return EVM_ADDRESS.test(address) ? getAddress(address) : value;
}

/**
 * A leg's address, reduced to {@link toEvmAddress}'s form when the leg's
 * chain resolved to an EVM chain id. Every other leg, Bitcoin, Sui, Solana,
 * Starknet or a chain that did not resolve, keeps the address it was sent.
 */
function getLegAddress(
  leg: MovementLeg | undefined,
  chainId: AnyChainId | 'bitcoin' | undefined,
): string | undefined {
  const address = leg?.address;
  return address && typeof chainId === 'number'
    ? toEvmAddress(address)
    : address;
}

function toNumber(value?: number | string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * The claim calls take bare hex: the EVM path adds the prefix itself and the
 * Sui path decodes with `Buffer.from(hex, 'hex')`, which yields no bytes for a
 * `0x`-prefixed string. The gateway passes the backend's value through, so
 * strip the prefix whichever form arrives.
 */
function toBareHex(value?: string): string | undefined {
  return value ? value.replace(/^0x/i, '') : value;
}

/** The destination leg's transaction: the mint, claim or payout. */
function getDestinationTxHash(movement: Movement): string | undefined {
  return movement.destination?.transaction_id || undefined;
}

/**
 * The marker v1 consumers already treat as "claimed, transaction unknown".
 * Used when a movement is completed before its destination leg carries the
 * transaction.
 */
const CLAIMED_WITHOUT_TX = 'true';

/* -------------------------------------------------------------------------- */
/*                                   Status                                   */
/* -------------------------------------------------------------------------- */

const SETTLED_STATUSES: string[] = [
  'MOVEMENT_STATUS_CLAIMABLE',
  'MOVEMENT_STATUS_COMPLETED',
];

/**
 * The v1 notarization status a consumer branches on. The gateway's status
 * wins where it is decisive: FAILED covers a notarization whose session
 * expired, which still reports SESSION_APPROVED underneath. Otherwise the
 * ledger's own value is used when it is one the SDK knows, and derived from
 * the status when it is not.
 */
export function getNotarizationStatus(movement: Movement): ENotarizationStatus {
  const { status } = movement;
  if (status === 'MOVEMENT_STATUS_FAILED') {
    return ENotarizationStatus.NOTARIZATION_STATUS_FAILED;
  }

  const passthrough = movement.notarization_data?.notarization_status;
  if (
    passthrough &&
    (Object.values(ENotarizationStatus) as string[]).includes(passthrough)
  ) {
    return passthrough as ENotarizationStatus;
  }

  if (
    status === 'MOVEMENT_STATUS_NOTARIZED' ||
    (status && SETTLED_STATUSES.includes(status))
  ) {
    return ENotarizationStatus.NOTARIZATION_STATUS_SESSION_APPROVED;
  }
  if (!status || status === 'MOVEMENT_STATUS_UNSPECIFIED') {
    return ENotarizationStatus.NOTARIZATION_STATUS_UNSPECIFIED;
  }
  return ENotarizationStatus.NOTARIZATION_STATUS_PENDING;
}

/**
 * v2 has no session state; the status carries it. CLAIMABLE and COMPLETED
 * follow a completed session, NOTARIZED an approved one still being signed,
 * and FAILED over an approved notarization is an expired session.
 */
export function getSessionState(movement: Movement): ESessionState {
  const { status } = movement;
  if (status && SETTLED_STATUSES.includes(status)) {
    return ESessionState.SESSION_STATE_COMPLETED;
  }
  if (
    status === 'MOVEMENT_STATUS_FAILED' &&
    movement.notarization_data?.notarization_status ===
      ENotarizationStatus.NOTARIZATION_STATUS_SESSION_APPROVED
  ) {
    return ESessionState.SESSION_STATE_EXPIRED;
  }
  if (!status || status === 'MOVEMENT_STATUS_UNSPECIFIED') {
    return ESessionState.SESSION_STATE_UNSPECIFIED;
  }
  return ESessionState.SESSION_STATE_PENDING;
}

/**
 * The leg's token. The SDK's address table is tried first, as in v1, under
 * both the adapter and the token address, since the two differ on some chains
 * and a leg may carry either. The table does not list every environment's
 * contracts, so the asset type the gateway sends is the fallback.
 */
function getLegToken(
  leg: MovementLeg | undefined,
  chainId: AnyChainId | undefined,
  env: Env | undefined,
): Token | undefined {
  const address = leg?.asset?.address;
  if (address && chainId !== undefined) {
    const token =
      getTokenByAddress(address, chainId, env, AddressKind.Adapter) ??
      getTokenByAddress(address, chainId, env, AddressKind.Token);
    if (token) return token;
  }
  switch (leg?.asset?.asset_type?.toLowerCase().replace(/^asset_type_/, '')) {
    case 'lbtc':
      return Token.LBTC;
    case 'btcb':
      return Token.BTCb;
    default:
      return undefined;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Mappers                                   */
/* -------------------------------------------------------------------------- */

export function mapMovementToDeposit(
  wireMovement: Movement,
  env?: Env,
  chainIdsByFamily?: ChainIdsByFamily,
): Deposit {
  const movement = normalizeMovement(wireMovement);
  const { source, destination, claim_data, notarization_data } = movement;
  const isNative = movement.type === 'MOVEMENT_TYPE_DEPOSIT_BTCB';
  const resolvedToChainId = getMovementChainId(
    destination?.chain,
    env,
    chainIdsByFamily,
  );
  // `Deposit.toChainId` has no Bitcoin member; a deposit never lands there.
  const toChainId =
    resolvedToChainId === 'bitcoin' ? undefined : resolvedToChainId;
  const claimTxHash =
    getDestinationTxHash(movement) ??
    (movement.status === 'MOVEMENT_STATUS_COMPLETED'
      ? CLAIMED_WITHOUT_TX
      : undefined);
  // The mint amount reads "0" until it is known; v1 left it unset, and a set
  // value is read as the notarized amount.
  const destinationAmount = parseMovementAmount(destination);
  const sourceChainId = getMovementChainId(
    source?.chain,
    env,
    chainIdsByFamily,
  );
  const fromChainId = isNative ? sourceChainId : undefined;
  const sourceAddress = getLegAddress(source, sourceChainId);

  return {
    isNative,
    txHash: source?.transaction_id ?? '',
    eventIndex: toNumber(source?.transaction_index) ?? 0,
    amount: parseMovementAmount(source),
    tokenAmount: destinationAmount.isZero() ? undefined : destinationAmount,
    depositAddress: isNative ? undefined : sourceAddress,
    fromAddress: isNative ? sourceAddress : undefined,
    toAddress: getLegAddress(destination, resolvedToChainId),
    toTokenAddress: destination?.asset?.address,
    toToken: getLegToken(destination, toChainId, env),
    toChainId: toChainId as AnyChainId,
    fromChainId: fromChainId === 'bitcoin' ? undefined : fromChainId,
    blockHeight: toNumber(source?.block_height),
    blockTime: toEpochSeconds(source?.block_time),
    payloadHash: claim_data?.payload_hash || undefined,
    rawPayload: toBareHex(claim_data?.raw_payload),
    proof: toBareHex(claim_data?.proof),
    sessionId: notarization_data?.session_id ?? '',
    notarizationStatus: getNotarizationStatus(movement),
    sessionState: getSessionState(movement),
    claimTxHash,
    isClaimed: Boolean(claimTxHash),
    sanctioned: movement.status === 'MOVEMENT_STATUS_SANCTIONED',
  };
}

/**
 * Whether a withdrawal pays out in BTC. The destination chain decides; a row
 * whose chain did not resolve falls back to its type, where `redeem_native`
 * is the payout and `redeem_lbtc` the redeem to BTC.b.
 */
function isPayout(
  toChainId: AnyChainId | 'bitcoin' | undefined,
  type?: string,
): boolean {
  if (toChainId !== undefined) return toChainId === 'bitcoin';
  return type !== 'MOVEMENT_TYPE_REDEEM_LBTC';
}

/**
 * v2 returns one withdrawal list where v1 had two: unstakes (LBTC paid out in
 * BTC) and redeems (BTC.b paid out in BTC, and LBTC to BTC.b on chain). v1's
 * `isNative` marks the redeems, and they alone carry a destination chain,
 * `'bitcoin'` for a payout. The source asset tells a BTC.b payout from an LBTC
 * one, since both are `redeem_native` here.
 */
export function mapMovementToUnstake(
  wireMovement: Movement,
  env?: Env,
  chainIdsByFamily?: ChainIdsByFamily,
): Unstake {
  const movement = normalizeMovement(wireMovement);
  const { source, destination, claim_data } = movement;
  const resolvedFromChainId = getMovementChainId(
    source?.chain,
    env,
    chainIdsByFamily,
  );
  const fromChainId =
    resolvedFromChainId === 'bitcoin' ? undefined : resolvedFromChainId;
  const toChainId = getMovementChainId(
    destination?.chain,
    env,
    chainIdsByFamily,
  );
  const payout = isPayout(toChainId, movement.type);
  const fromBtcb = getLegToken(source, fromChainId, env) === Token.BTCb;
  const isNative = !payout || fromBtcb;
  const destinationTxHash = getDestinationTxHash(movement);
  const payoutTxHash = payout ? destinationTxHash : undefined;
  const isCompleted =
    movement.status === 'MOVEMENT_STATUS_COMPLETED' || Boolean(payoutTxHash);

  return {
    isNative,
    txHash: source?.transaction_id ?? '',
    fromChainId: fromChainId as AnyChainId,
    toChainId: isNative ? (payout ? 'bitcoin' : toChainId) : undefined,
    blockHeight: toNumber(source?.block_height) ?? 0,
    blockTime: toEpochSeconds(source?.block_time) ?? 0,
    fromAddress: getLegAddress(source, resolvedFromChainId) ?? '',
    toAddress: getLegAddress(destination, toChainId),
    amount: parseMovementAmount(source),
    payoutTxHash,
    payoutTxIndex: payout
      ? toNumber(destination?.transaction_index)
      : undefined,
    payoutTxStatus: isCompleted
      ? PayoutTxStatus.Completed
      : PayoutTxStatus.Pending,
    sanctioned: movement.status === 'MOVEMENT_STATUS_SANCTIONED',
    proof: toBareHex(claim_data?.proof),
    rawPayload: toBareHex(claim_data?.raw_payload),
    toToken: isNative ? Token.BTCb : undefined,
    toTokenAddress: payout ? undefined : destination?.asset?.address,
    notarizationStatus: getNotarizationStatus(movement),
    sessionState: getSessionState(movement),
    claimTxHash: payout ? undefined : destinationTxHash,
    fromTokenAddress: source?.asset?.address,
  };
}

export function mapMovementToBridge(
  wireMovement: Movement,
  env?: Env,
  chainIdsByFamily?: ChainIdsByFamily,
): PortfolioBridge {
  const movement = normalizeMovement(wireMovement);
  const { source, destination } = movement;
  const fromChainId = getMovementChainId(source?.chain, env, chainIdsByFamily);
  const toChainId = getMovementChainId(
    destination?.chain,
    env,
    chainIdsByFamily,
  );

  return {
    txHash: source?.transaction_id ?? '',
    blockTime: toEpochSeconds(source?.block_time),
    amount: parseMovementAmount(source),
    fromAddress: getLegAddress(source, fromChainId),
    toAddress: getLegAddress(destination, toChainId),
    fromChainId: fromChainId === 'bitcoin' ? undefined : fromChainId,
    toChainId: toChainId === 'bitcoin' ? undefined : toChainId,
    tokenAddress: source?.asset?.address,
    destinationTxHash: getDestinationTxHash(movement),
    status: movement.status as MovementStatus | undefined,
  };
}
