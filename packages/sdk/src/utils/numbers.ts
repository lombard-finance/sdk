import BigNumber from 'bignumber.js';

export default function toBigInt(input: BigNumber.Value) {
  return BigInt(BigNumber(input).toFixed());
}
