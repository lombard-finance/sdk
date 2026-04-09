/**
 * Validation Schemas
 *
 * Centralized Zod schemas for validating SDK inputs.
 * These provide type-safe, declarative validation with clear error messages.
 *
 * @module shared/validation
 */

import * as bitcoin from "bitcoinjs-lib";
import { z } from "zod";

import { MIN_STAKE_AMOUNT_BTC } from "../../common/constants";

// ═══════════════════════════════════════════════════════════════════════════
// Address Validation Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a Bitcoin address using bitcoinjs-lib
 * This validates the checksum for all address types:
 * - Legacy P2PKH (1..., m..., n...)
 * - P2SH (3..., 2...)
 * - SegWit bech32 (bc1q..., tb1q...)
 * - Taproot bech32m (bc1p..., tb1p...)
 *
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidBitcoinAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Bech32/Bech32m addresses (bc1..., tb1...)
  if (address.startsWith("bc1") || address.startsWith("tb1")) {
    try {
      bitcoin.address.fromBech32(address);
      return true;
    } catch {
      return false;
    }
  }

  // Legacy and P2SH addresses (base58check)
  try {
    bitcoin.address.fromBase58Check(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a Solana address (base58 with proper structure)
 * Solana addresses are ed25519 public keys encoded in base58
 *
 * Note: Unlike Bitcoin, Solana addresses don't have a built-in checksum.
 * We validate that the address decodes to exactly 32 bytes.
 *
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 */
export function isValidSolanaAddress(address: string): boolean {
  // Base58 character set (no 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;

  if (!address || typeof address !== "string") {
    return false;
  }

  if (!base58Regex.test(address)) {
    return false;
  }

  // Solana addresses are exactly 32 bytes when decoded
  // In base58, this results in 32-44 characters
  if (address.length < 32 || address.length > 44) {
    return false;
  }

  // Validate the base58 decoding produces exactly 32 bytes
  try {
    const decoded = decodeBase58(address);
    return decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Base58 decoder for validation purposes
 * Based on the Bitcoin/Solana base58 alphabet
 */
function decodeBase58(str: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const ALPHABET_MAP: Record<string, number> = {};
  for (let i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET[i]] = i;
  }

  if (str.length === 0) {
    return new Uint8Array(0);
  }

  // Count leading zeros (represented by '1' in base58)
  let leadingZeros = 0;
  for (let i = 0; i < str.length && str[i] === "1"; i++) {
    leadingZeros++;
  }

  // Decode the rest
  const size = Math.ceil((str.length * Math.log(58)) / Math.log(256));
  const bytes = new Uint8Array(size);

  for (let i = leadingZeros; i < str.length; i++) {
    const value = ALPHABET_MAP[str[i]];
    if (value === undefined) {
      throw new Error(`Invalid base58 character: ${str[i]}`);
    }

    let carry = value;
    for (let j = size - 1; j >= 0; j--) {
      carry += 58 * bytes[j];
      bytes[j] = carry % 256;
      carry = Math.floor(carry / 256);
    }
  }

  // Find first non-zero byte
  let firstNonZero = 0;
  while (firstNonZero < bytes.length && bytes[firstNonZero] === 0) {
    firstNonZero++;
  }

  // Combine leading zeros with decoded bytes
  const result = new Uint8Array(leadingZeros + (bytes.length - firstNonZero));
  result.fill(0, 0, leadingZeros);
  result.set(bytes.subarray(firstNonZero), leadingZeros);

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Amount Schemas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create an amount schema with configurable minimum
 *
 * @param minAmount - Minimum amount in human-readable format (e.g., 0.0002)
 * @returns Zod schema for amount validation
 */
export function createAmountSchema(minAmount?: number) {
  const baseSchema = z
    .string({ message: "Amount is required" })
    .min(1, "Amount is required")
    .refine((val) => val !== "0", {
      message: "Amount must be greater than 0",
    })
    .refine(
      (val) => {
        const num = Number.parseFloat(val);
        return !Number.isNaN(num) && num > 0;
      },
      { message: "Invalid amount format" },
    );

  if (minAmount !== undefined && minAmount > 0) {
    return baseSchema.refine(
      (val) => {
        const num = Number.parseFloat(val);
        return num >= minAmount;
      },
      { message: `Amount must be at least ${minAmount}` },
    );
  }

  return baseSchema;
}

/**
 * Amount validation (human-readable string, e.g., "0.1")
 *
 * Validates:
 * - Non-empty string
 * - Not "0"
 * - Parses to positive number
 *
 * Used for both BTC and EVM amounts.
 */
export const amountSchema = createAmountSchema();

/**
 * BTC stake amount schema with minimum 0.0002 BTC
 */
export const btcStakeAmountSchema = createAmountSchema(MIN_STAKE_AMOUNT_BTC);

/** @deprecated Use amountSchema instead */
export const btcAmountSchema = amountSchema;

/** Alias for EVM operations */
export const evmAmountSchema = amountSchema;

/**
 * Satoshi amount validation (bigint or number)
 */
export const satoshiAmountSchema = z
  .union([z.bigint(), z.number()])
  .refine((val) => val > 0, { message: "Amount must be greater than 0" });

// ═══════════════════════════════════════════════════════════════════════════
// Address Schemas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * EVM address validation (0x + 40 hex chars)
 */
export const evmAddressSchema = z
  .string({ message: "Address is required" })
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address format");

/**
 * Solana address validation (base58, exactly 32 bytes when decoded)
 * Uses proper base58 decoding to verify the address structure
 */
export const solanaAddressSchema = z
  .string({ message: "Address is required" })
  .refine(isValidSolanaAddress, { message: "Invalid Solana address format" });

/**
 * Sui address validation (0x + 64 hex chars)
 */
export const suiAddressSchema = z
  .string({ message: "Address is required" })
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid Sui address format");

/**
 * Starknet address validation (0x + 1-64 hex chars)
 */
export const starknetAddressSchema = z
  .string({ message: "Address is required" })
  .regex(/^0x[a-fA-F0-9]{1,64}$/, "Invalid Starknet address format");

/**
 * Bitcoin address validation with proper checksum verification
 * Uses bitcoinjs-lib to validate all address formats:
 * - Legacy P2PKH (1..., m..., n...)
 * - P2SH (3..., 2...)
 * - SegWit bech32 (bc1q..., tb1q...)
 * - Taproot bech32m (bc1p..., tb1p...)
 */
export const bitcoinAddressSchema = z
  .string({ message: "Address is required" })
  .refine(isValidBitcoinAddress, { message: "Invalid Bitcoin address format" });

/**
 * Map of chain type to address schema
 */
export const addressSchemasByChainType = {
  evm: evmAddressSchema,
  solana: solanaAddressSchema,
  sui: suiAddressSchema,
  starknet: starknetAddressSchema,
  bitcoin: bitcoinAddressSchema,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Common Schemas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Referral code validation (optional string)
 */
export const referralCodeSchema = z.string().optional();

/**
 * Transaction hash validation (0x + 64 hex chars)
 */
export const txHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash");

// ═══════════════════════════════════════════════════════════════════════════
// BTC Stake Schemas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BTC Stake prepare params schema (base - recipient validated separately per chain)
 */
export const btcStakePrepareBaseSchema = z.object({
  amount: btcStakeAmountSchema,
  recipient: z
    .string({ message: "Recipient is required" })
    .min(1, "Recipient is required"),
  referralCode: referralCodeSchema,
});

/**
 * Create a prepare schema with chain-specific address validation
 */
export function createBtcStakePrepareSchema(addressSchema: z.ZodString) {
  return z.object({
    amount: btcStakeAmountSchema,
    recipient: addressSchema,
    referralCode: referralCodeSchema,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Type Exports
// ═══════════════════════════════════════════════════════════════════════════

export type Amount = z.infer<typeof amountSchema>;
/** @deprecated Use Amount instead */
export type BtcAmount = Amount;
export type EvmAddress = z.infer<typeof evmAddressSchema>;
export type SolanaAddress = z.infer<typeof solanaAddressSchema>;
export type SuiAddress = z.infer<typeof suiAddressSchema>;
export type StarknetAddress = z.infer<typeof starknetAddressSchema>;
export type BitcoinAddress = z.infer<typeof bitcoinAddressSchema>;
export type BtcStakePrepareParams = z.infer<typeof btcStakePrepareBaseSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// Validation Helpers
// ═══════════════════════════════════════════════════════════════════════════

import type { Chain } from "../../core";
import { LombardError } from "../errors";

/**
 * Validation error handler configuration
 */
export interface ValidationErrorConfig {
  /** Chain for address validation errors (optional) */
  destChain?: Chain;
}

/**
 * Validate prepare params with standard error handling
 *
 * This helper provides consistent Zod validation with LombardError mapping:
 * - 'amount' field → LombardError.invalidAmount()
 * - 'recipient' field → LombardError.invalidAddress()
 * - Other fields → LombardError.invalidParameter()
 *
 * @example
 * ```typescript
 * private validatePrepareParams(params: PrepareParams) {
 *   return validatePrepareParams(this.prepareSchema, params, {
 *     destChain: this.params.destChain,
 *   });
 * }
 * ```
 */
export function validatePrepareParams<T>(
  schema: z.ZodSchema<T>,
  params: unknown,
  config: ValidationErrorConfig = {},
): T {
  const result = schema.safeParse(params);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path[0];
    const message = firstIssue?.message ?? "Invalid parameter";

    if (path === "amount") {
      throw LombardError.invalidAmount(message);
    }
    if (path === "recipient") {
      throw LombardError.invalidAddress(
        (params as Record<string, unknown>)?.recipient as string,
        config.destChain,
      );
    }
    throw LombardError.invalidParameter(String(path), message);
  }

  return result.data;
}

/**
 * Validate and parse input, throwing error on failure
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorFactory: (message: string) => Error,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    throw errorFactory(firstIssue?.message ?? "Validation failed");
  }
  return result.data;
}

/**
 * Validate input, returning result object
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
