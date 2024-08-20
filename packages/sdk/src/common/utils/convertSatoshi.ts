const BTC_DECIMALS = 8;
const SATOSHI_SCALE = 10 ** BTC_DECIMALS;

/**
 * Convert Satoshi to BTC
 * @param amount - Satoshi amount
 * @returns BTC amount
 */
export function fromSatoshi(amount: number | string) {
  return +amount / SATOSHI_SCALE;
}

/**
 * Convert BTC to Satoshi
 *
 * @param amount - BTC amount
 * @returns Satoshi amount
 */
export function toSatoshi(amount: number | string) {
  return Math.floor(+amount * SATOSHI_SCALE);
}
