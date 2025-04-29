import BigNumber from 'bignumber.js';

export const ZERO = BigNumber(0);
export const ONE = BigNumber(1);

export default function toBigInt(input: BigNumber.Value) {
  return BigInt(BigNumber(input).toFixed());
}
