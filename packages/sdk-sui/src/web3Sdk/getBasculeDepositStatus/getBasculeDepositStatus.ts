import { DEFAULT_ENV, Env } from '@lombard.finance/sdk-common';
import type { SuiClient } from '@mysten/sui/client';
import { keccak_256 } from '@noble/hashes/sha3';

import { getConfig } from '../../const';

type Not0xPrefixedHex = string;

/**
 * The Bascule deposit status on Sui, mirroring the EVM SDK's
 * `BasculeDepositStatus`. `PAUSED` is Sui-specific: the on-chain
 * `validate_withdrawal` aborts for every deposit while the Bascule is paused,
 * so there is no point inspecting an individual deposit.
 */
export enum SuiBasculeDepositStatus {
  /** Deposit is not reported yet (or unknown) — minting would abort. */
  UNREPORTED = 'UNREPORTED',
  /** Deposit is reported and may be minted. */
  REPORTED = 'REPORTED',
  /** Deposit has already been withdrawn (already minted). */
  WITHDRAWN = 'WITHDRAWN',
  /** The Bascule is paused — no deposit can be minted right now. */
  PAUSED = 'PAUSED',
}

// On-chain DepositState enum variant names (see bascule::bascule::DepositState).
const DEPOSIT_REPORTED = 'Reported';
const DEPOSIT_WITHDRAWN = 'Withdrawn';

// Mint payload layout (matches consortium::payload_decoder::decode_mint_payload):
// a 4-byte action selector followed by 5 big-endian 32-byte words:
// to_chain || recipient || amount || tx_id || vout.
const SELECTOR_LEN = 4;
const WORD_LEN = 32;
const WORDS = 5;
const PAYLOAD_LEN = SELECTOR_LEN + WORDS * WORD_LEN;

export interface IGetSuiBasculeDepositStatusParameters {
  /** Sui RPC client. */
  client: SuiClient;
  /**
   * The raw mint payload (hex, with or without `0x` prefix), see
   * `Deposit.rawPayload`.
   */
  payload: Not0xPrefixedHex;
  /** The optional environment identifier (defaults to the SDK default). */
  env?: Env;
}

/**
 * Returns the Bascule deposit status for a Sui mint payload, so a claim can be
 * pre-flighted before submitting the transaction (the on-chain
 * `bascule::validate_withdrawal` would otherwise abort the mint).
 *
 * The deposit id is derived exactly as `bascule::bascule::to_deposit_id` does
 * on-chain (and as `sui-claimer` derives it server-side):
 *
 *   keccak256( zero32 || 0x03,0x53,0x55,0x49 || to || u64_le(amount) || tx_id || u32_le(index) )
 *
 * read back as a little-endian u256.
 */
export async function getBasculeDepositStatus({
  client,
  payload,
  env = DEFAULT_ENV,
}: IGetSuiBasculeDepositStatusParameters): Promise<SuiBasculeDepositStatus> {
  const { bascule } = getConfig(env);

  // No Bascule configured for this env — treat as reported (parity with the EVM
  // SDK, which returns REPORTED when the bascule address is the zero address).
  if (!bascule) {
    return SuiBasculeDepositStatus.REPORTED;
  }

  const depositId = deriveDepositId(payload);
  const { paused, depositTableId } = await getBasculeState(client, bascule);

  // While paused, validate_withdrawal aborts for every deposit, so there is no
  // point looking up the individual deposit status.
  if (paused) {
    return SuiBasculeDepositStatus.PAUSED;
  }

  const status = await getDepositStatus(client, depositTableId, depositId);
  switch (status) {
    case DEPOSIT_REPORTED:
      return SuiBasculeDepositStatus.REPORTED;
    case DEPOSIT_WITHDRAWN:
      return SuiBasculeDepositStatus.WITHDRAWN;
    default:
      // Not found, or an unrecognized status — not mintable.
      return SuiBasculeDepositStatus.UNREPORTED;
  }
}

interface BasculeState {
  depositTableId: string;
  paused: boolean;
}

/**
 * Reads the shared Bascule object and extracts the deposit-history table id and
 * the pause flag.
 */
async function getBasculeState(
  client: SuiClient,
  basculeAddress: string,
): Promise<BasculeState> {
  const resp = await client.getObject({
    id: basculeAddress,
    options: { showContent: true },
  });

  const content = resp.data?.content;
  if (!content || content.dataType !== 'moveObject') {
    throw new Error(`Bascule object ${basculeAddress} has no content`);
  }

  const fields = content.fields as Record<string, unknown>;

  const paused = fields.mIsPaused;
  if (typeof paused !== 'boolean') {
    throw new Error(
      `Bascule object ${basculeAddress} has invalid mIsPaused field`,
    );
  }

  const depositTableId = nestedString(fields, [
    'mDepositHistory',
    'fields',
    'id',
    'id',
  ]);

  return { depositTableId, paused };
}

/**
 * Looks up a deposit id in the Bascule deposit-history table. Returns the
 * DepositState variant name (`Reported`/`Withdrawn`) or `undefined` if there is
 * no entry. A missing dynamic field is surfaced by the RPC as an error / empty
 * data rather than a thrown transport error.
 */
async function getDepositStatus(
  client: SuiClient,
  tableId: string,
  depositId: string,
): Promise<string | undefined> {
  const resp = await client.getDynamicFieldObject({
    parentId: tableId,
    name: { type: 'u256', value: depositId },
  });

  const content = resp.data?.content;
  if (!content || content.dataType !== 'moveObject') {
    return undefined;
  }

  const fields = content.fields as Record<string, unknown>;
  const value = fields.value;
  if (value && typeof value === 'object' && 'variant' in value) {
    const variant = (value as { variant: unknown }).variant;
    if (typeof variant === 'string') {
      return variant;
    }
  }
  return undefined;
}

/**
 * Derives the Bascule deposit id (a u256, returned as a decimal string) exactly
 * as `bascule::bascule::to_deposit_id` does on-chain.
 */
export function deriveDepositId(payloadHex: Not0xPrefixedHex): string {
  const raw = hexToBytes(payloadHex);
  if (raw.length !== PAYLOAD_LEN) {
    throw new Error(
      `Invalid mint payload length ${raw.length}, want ${PAYLOAD_LEN}`,
    );
  }

  const body = raw.subarray(SELECTOR_LEN);
  const word = (i: number) => body.subarray(i * WORD_LEN, (i + 1) * WORD_LEN);
  // word(0) = to_chain (unused for the deposit id)

  const to = word(1); // recipient, 32-byte big-endian address bytes
  const amount = bigEndianWordToUint(word(2), 8, 'amount'); // u64
  // tx_id = bcs::to_bytes(&txid_u256): the payload word is big-endian, BCS of a
  // u256 is little-endian, so bascule sees the word reversed.
  const txId = reversed(word(3));
  const index = bigEndianWordToUint(word(4), 4, 'vout'); // u32

  const preimage = concatBytes(
    new Uint8Array(32), // CODESYNC(non-evm-prefix): 32 zero bytes
    Uint8Array.from([0x03, 0x53, 0x55, 0x49]), // CODESYNC(sui-unique-id)
    to,
    uintToLeBytes(amount, 8),
    txId,
    uintToLeBytes(index, 4),
  );

  const digest = keccak_256(preimage);

  // peel_u256 reads the digest as a little-endian u256.
  let value = 0n;
  for (let i = digest.length - 1; i >= 0; i--) {
    value = (value << 8n) | BigInt(digest[i]);
  }
  return value.toString();
}

// --- byte helpers -----------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid payload hex: odd length');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error('Invalid payload hex: non-hex characters');
    }
    out[i] = byte;
  }
  return out;
}

/**
 * Mirrors `u256.try_as_u64()/try_as_u32()`: the value must fit in `byteWidth`
 * bytes, i.e. the upper bytes of the big-endian word must be zero.
 */
function bigEndianWordToUint(
  word: Uint8Array,
  byteWidth: number,
  label: string,
): bigint {
  for (let i = 0; i < word.length - byteWidth; i++) {
    if (word[i] !== 0) {
      throw new Error(`${label} does not fit in u${byteWidth * 8}`);
    }
  }
  let value = 0n;
  for (let i = word.length - byteWidth; i < word.length; i++) {
    value = (value << 8n) | BigInt(word[i]);
  }
  return value;
}

function uintToLeBytes(value: bigint, byteWidth: number): Uint8Array {
  const out = new Uint8Array(byteWidth);
  let v = value;
  for (let i = 0; i < byteWidth; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function reversed(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[bytes.length - 1 - i];
  }
  return out;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function nestedString(
  fields: Record<string, unknown>,
  keys: string[],
): string {
  let cur: unknown = fields;
  for (let i = 0; i < keys.length; i++) {
    if (cur === null || typeof cur !== 'object') {
      throw new Error(`key "${keys[i - 1]}" is not an object`);
    }
    cur = (cur as Record<string, unknown>)[keys[i]];
    if (cur === undefined) {
      throw new Error(`missing key "${keys[i]}"`);
    }
  }
  if (typeof cur !== 'string') {
    throw new Error(`key "${keys[keys.length - 1]}" is not a string`);
  }
  return cur;
}
