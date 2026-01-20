import BigNumber from 'bignumber.js';

export const ZERO = BigNumber(0);
export const ONE = BigNumber(1);

/**
 * Converts an integer value to BigInt.
 *
 * IMPORTANT: Input must already be in base units (satoshis, wei, etc).
 * - For BTC amounts: use `toSatoshi(btcAmount)` first
 * - For token amounts: use `toBaseDenomination(amount, decimals)` first
 *
 * @param input - Integer value in base units
 * @returns BigInt representation
 * @throws Error if input is not an integer
 *
 * @example
 * // ✅ Correct usage
 * toBigInt(toSatoshi("0.001")); // Convert BTC to satoshis first
 * toBigInt(toBaseDenomination("1.5", 18)); // Convert tokens to base units first
 * toBigInt(1000); // Already in base units
 *
 * // ❌ Wrong - will throw
 * toBigInt(0.001); // Decimal BTC amount
 */
export default function toBigInt(input: BigNumber.Value): bigint {
  const bn = BigNumber(input);

  if (!bn.isInteger()) {
    throw new Error(
      `toBigInt received non-integer value "${input}". ` +
        `Convert to base units first: use toSatoshi() for BTC or toBaseDenomination() for tokens.`,
    );
  }

  return BigInt(bn.toFixed(0));
}
