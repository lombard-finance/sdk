import { Buffer } from "node:buffer"; // Use buffer package for cross-platform compatibility

import { PublicKey } from "@solana/web3.js";
import { keccak256 } from "js-sha3";

/**
 * Represents the unique identifier for a deposit, derived from transaction details.
 * It's a 32-byte array, typically the result of a Keccak-256 hash.
 */
export type DepositId = Uint8Array;

/**
 * Generates a unique deposit ID (address) based on transaction details, mirroring
 * the logic used in the corresponding Solana smart contract.
 *
 * The ID is computed using the following formula:
 * keccak256(
 *   [0u8; 32]                   // 32-byte zero prefix
 *   || [0x03, 0x53, 0x4f, 0x4c] // 4-byte chain ID ("\x03SOL")
 *   || recipient (32 bytes)
 *   || amount (u64, 8 bytes, big-endian)
 *   || tx_id (32 bytes)
 *   || tx_vout (u32, 4 bytes, big-endian)
 * )
 *
 * Adapted from: https://github.com/lombard-finance/sol-contracts/blob/632491cb92fd2f206b0e563b1e72e4b2ae2eadf5/programs/bascule/src/instructions/validator.rs#L118-L138
 *
 * @param recipient - The recipient's Solana public key.
 * @param amount - The amount of the transaction (as a bigint, representing u64).
 * @param txId - The transaction ID (as a 32-byte Uint8Array or Buffer).
 * @param txVout - The transaction output index (as a number, representing u32).
 * @returns A 32-byte Uint8Array representing the calculated deposit ID.
 * @throws Error if txId is not 32 bytes long.
 */
export function generateDepositId(
  recipient: PublicKey,
  amount: bigint,
  txId: string,
  txVout: number,
): DepositId {
  const txIdBuffer = Buffer.from(txId, "hex");
  const reversedTxIdBuffer = txIdBuffer.reverse();

  if (reversedTxIdBuffer.length !== 32) {
    throw new Error("txId must be a 32-byte array.");
  }

  const prefix = Buffer.alloc(32, 0);
  const chainId = Buffer.from([0x03, 0x53, 0x4f, 0x4c]);
  const recipientBuffer = recipient.toBuffer();
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64BE(amount);

  const txVoutBuffer = Buffer.alloc(4);
  txVoutBuffer.writeUInt32BE(txVout);

  const dataToHash = Buffer.concat([
    new Uint8Array(prefix),
    new Uint8Array(chainId),
    new Uint8Array(recipientBuffer),
    new Uint8Array(amountBuffer),
    new Uint8Array(reversedTxIdBuffer),
    new Uint8Array(txVoutBuffer),
  ]);

  const dataToHashUint8Array = new Uint8Array(
    dataToHash.buffer,
    dataToHash.byteOffset,
    dataToHash.byteLength,
  );
  const hashString = keccak256(dataToHashUint8Array);
  const hashBuffer = Buffer.from(hashString, "hex");

  return new Uint8Array(hashBuffer);
}
