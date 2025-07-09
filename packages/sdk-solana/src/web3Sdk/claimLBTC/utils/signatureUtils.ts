import { Buffer } from 'node:buffer';
import { BN } from '@coral-xyz/anchor';

/**
 * Result of parsing signatures from a proof
 */
export interface ParsedSignatures {
  /**
   * The parsed signatures as Uint8Arrays (original bytes)
   */
  signatures: Uint8Array[];
  /**
   * The original indices of the non-empty signatures
   */
  indices: BN[];
}

/**
 * Parse ABI-encoded signatures from a proof string.
 * Assumes the structure produced by Go abi.Arguments.Pack([][]byte{...}) for the test cases:
 * Structure:
 * - Header Offset (32 bytes): Offset to start of length/offsets block (0x20)
 * - Array length N (32 bytes)
 * - Offsets block (N * 32 bytes): Starts at byte 64. Contains byte offsets for each element,
 *                                relative to the *start of the offsets block* (byte 64).
 * - Data block: Starts after offsets block. Contains concatenated elements,
 *               where each element is [Length (32 bytes) = 64][Data (64 bytes)].
 *
 * @param proofSignature The hex-encoded proof signature string (with or without 0x prefix)
 * @returns The parsed non-empty signatures and their original indices
 */
export const parseSignaturesFromProof = (
  proofSignature: string | null | undefined,
): ParsedSignatures => {
  // Basic validation for null/undefined/empty string
  if (!proofSignature) {
    return { signatures: [], indices: [] };
  }

  const rawProof = proofSignature.startsWith('0x')
    ? proofSignature.slice(2)
    : proofSignature;

  // Min length required for ABI header (64 bytes)
  if (rawProof.length < 128) {
    return { signatures: [], indices: [] };
  }

  const signatures: Uint8Array[] = [];
  const indices: BN[] = [];

  try {
    // 1. Read Header Offset (Bytes 0-31) - Expected to be 32 (0x20)
    const headerOffset = Number.parseInt(rawProof.slice(0, 64), 16);
    if (Number.isNaN(headerOffset) || headerOffset !== 32) {
      // Allow potentially non-standard offset, but structure might be wrong
      console.warn(`Unexpected ABI header offset: ${headerOffset}`);
    }

    // 2. Read Array length N (Bytes 32-63)
    const lengthStartChar = 32 * 2;
    const arrayLengthHex = rawProof.slice(
      lengthStartChar,
      lengthStartChar + 64,
    );
    const numSignatures = Number.parseInt(arrayLengthHex, 16);
    if (Number.isNaN(numSignatures) || numSignatures < 0) {
      // Invalid length implies corrupted data
      return { signatures: [], indices: [] };
    }

    if (numSignatures === 0) {
      return { signatures: [], indices: [] };
    }

    // 3. Define offsets block start position
    const offsetsBlockStartByte = 64; // Header (offset + length) ends at byte 63

    // Check if proof is long enough for header and the offsets block itself
    const offsetsBlockEndByte = offsetsBlockStartByte + numSignatures * 32;
    if (offsetsBlockEndByte * 2 > rawProof.length) {
      // Proof is too short to contain all declared offsets
      return { signatures: [], indices: [] };
    }

    // 4. Iterate through each signature element declared
    for (let i = 0; i < numSignatures; i++) {
      // 4a. Read the relative offset for this element from the offsets block
      const offsetValueStartChar = offsetsBlockStartByte * 2 + i * 64;
      const offsetHex = rawProof.slice(
        offsetValueStartChar,
        offsetValueStartChar + 64,
      );
      const elementRelativeOffset = Number.parseInt(offsetHex, 16);
      if (Number.isNaN(elementRelativeOffset)) {
        // Invalid offset implies corrupted data
        return { signatures: [], indices: [] };
      }

      // 4b. Calculate absolute start byte of the element's 32-byte LENGTH prefix
      // Offset is relative to the START OF THE OFFSETS BLOCK (byte 64)
      const lengthPrefixStartByte =
        offsetsBlockStartByte + elementRelativeOffset;
      const lengthPrefixStartChar = lengthPrefixStartByte * 2;
      const lengthPrefixEndChar = lengthPrefixStartChar + 64;

      // 4c. Calculate absolute start byte of the actual 64-byte SIGNATURE DATA
      const signatureDataStartByte = lengthPrefixStartByte + 32;
      const signatureDataStartChar = signatureDataStartByte * 2;
      const signatureDataEndChar = signatureDataStartChar + 128;

      // Boundary check: Can we read the length prefix within the proof?
      if (lengthPrefixEndChar > rawProof.length) {
        // Offset points to data outside the proof bounds
        return { signatures: [], indices: [] };
      }

      // 4d. Read and check the element's length prefix (expecting 64)
      const lengthHex = rawProof.slice(
        lengthPrefixStartChar,
        lengthPrefixEndChar,
      );
      const elementLength = Number.parseInt(lengthHex, 16);
      if (Number.isNaN(elementLength) || elementLength !== 64) {
        // Go code packs 64 bytes (data or placeholder), so length should always be 64
        // Skip elements with unexpected length
        console.warn(
          `Signature element ${i} length is ${elementLength}, expected 64. Skipping.`,
        );
        continue;
      }

      // Boundary check: Can we read the 64 bytes of signature data?
      if (signatureDataEndChar > rawProof.length) {
        // Length prefix was valid, but proof is truncated before the data ends
        return { signatures: [], indices: [] };
      }

      // 4e. Slice the 64-byte signature data hex
      const signatureHex = rawProof.slice(
        signatureDataStartChar,
        signatureDataEndChar,
      );

      // 4f. Check if it's an empty placeholder (64 zero bytes)
      const signatureBytesCheck = Buffer.from(signatureHex, 'hex');
      // Double-check buffer length in case of unforeseen slicing issues
      if (signatureBytesCheck.length !== 64) {
        continue;
      }

      const isEmptyPlaceholder = signatureBytesCheck.every(byte => byte === 0);

      if (isEmptyPlaceholder) {
        // Skip placeholders
        continue;
      }

      // 4g. Store the valid, non-empty signature and its original index
      signatures.push(new Uint8Array(signatureBytesCheck));
      indices.push(new BN(i));
    }

    return { signatures, indices };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Catch any unexpected errors during parsing
    console.error('Error parsing signature proof:', errorMessage);
    return { signatures: [], indices: [] };
  }
};
