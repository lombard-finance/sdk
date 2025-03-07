import BigNumber from 'bignumber.js';

const BTC_DECIMALS = 8;
export const SATOSHI_SCALE = BigNumber(10).pow(BTC_DECIMALS);

/**
 * Converts Satoshi to BTC
 * @param amount - Satoshi amount
 * @returns BTC amount
 */
export function fromSatoshi(amount: number | string | BigNumber) {
  return BigNumber(amount).dividedBy(SATOSHI_SCALE);
}

/**
 * Converts BTC to Satoshi
 *
 * @param amount - BTC amount
 * @returns Satoshi amount
 */
export function toSatoshi(amount: number | string | BigNumber) {
  return BigNumber(amount)
    .multipliedBy(SATOSHI_SCALE)
    .decimalPlaces(0, BigNumber.ROUND_HALF_UP);
}
