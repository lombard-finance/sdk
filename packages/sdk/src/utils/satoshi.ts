import BigNumber from "bignumber.js";

export const BTC_DECIMALS = 8;
export const SATOSHI_SCALE = BigNumber(10).pow(BTC_DECIMALS);

/**
 * Converts Satoshi to BTC
 * @param amount - Satoshi amount (integer)
 * @returns BTC amount (decimal, e.g., 0.00001992)
 */
export function fromSatoshi(amount: BigNumber.Value): BigNumber {
  return BigNumber(amount).dividedBy(SATOSHI_SCALE);
}

/**
 * Converts BTC to Satoshi
 *
 * @param amount - BTC amount (decimal, e.g., 0.00001992)
 * @returns Satoshi amount (integer, e.g., 1992)
 */
export function toSatoshi(amount: BigNumber.Value): BigNumber {
  return BigNumber(amount)
    .multipliedBy(SATOSHI_SCALE)
    .decimalPlaces(0, BigNumber.ROUND_HALF_UP);
}

/**
 * Converts BTC amount to BigInt satoshis
 *
 * Use this when you need to pass a BTC amount to a function expecting BigInt.
 *
 * @param btcAmount - BTC amount (decimal, e.g., "0.00001992")
 * @returns BigInt satoshi amount (e.g., 1992n)
 *
 * @example
 * const fee = "0.00001992"; // from getLBTCMintingFee
 * const feeSatoshis = toSatoshiBigInt(fee); // 1992n
 */
export function toSatoshiBigInt(btcAmount: BigNumber.Value): bigint {
  return BigInt(toSatoshi(btcAmount).toFixed(0));
}
