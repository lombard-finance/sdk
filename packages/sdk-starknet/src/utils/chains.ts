import BigNumber from 'bignumber.js';
import { shortString } from 'starknet';

/** Starknet Main (mainnet) chain id */
const SN_MAIN = shortString.encodeShortString('SN_MAIN'); // 0x534e5f4d41494e
/** Starknet Sepolia chain id */
const SN_SEPOLIA = shortString.encodeShortString('SN_SEPOLIA'); // 0x534e5f5345504f4c4941

/** Prefixes the destination chain with 0x04... */
export function makeDestinationChainId(chainId: `0x${string}`) {
  const ch = BigInt(chainId);
  const ch64 = `0x04${ch.toString(16).padStart(64, '0').slice(2)}`;
  return BigNumber(ch64).toFixed(0);
}

/** Starknet chain id */
export enum StarknetChainId {
  SN_MAIN = '0x534e5f4d41494e', // encodeShortString('SN_MAIN'),
  SN_SEPOLIA = '0x534e5f5345504f4c4941',
}

/** Starknet chain identifier (human readable). */
export enum StarknetChain {
  Mainnet = 'starknet:mainnet',
  Sepolia = 'starknet:sepolia',
}

export type ChainParameters = {
  /** The starknet chain identifier. */
  chainId?: StarknetChainId;
};
