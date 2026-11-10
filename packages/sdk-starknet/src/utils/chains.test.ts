/**
 * Starknet chain identifiers
 *
 * `sdk-starknet` ships to 1.0.0 in this release with no tests at all.
 *
 * `makeDestinationChainId` is the first thing worth pinning: its output is both
 * the `to_chain` argument passed to the mint contract and part of the message
 * the user signs. A change to the encoding sends a mint to a different chain
 * than the one the signature attests to.
 */

import { describe, expect, it } from 'vitest';

import {
  makeDestinationChainId,
  StarknetChain,
  StarknetChainId,
} from './chains';

describe('StarknetChainId', () => {
  // These are the felt-encoded ASCII of "SN_MAIN" and "SN_SEPOLIA". They are
  // consensus values, not ours to change.
  it('encodes mainnet as the felt for SN_MAIN', () => {
    expect(StarknetChainId.SN_MAIN).toBe('0x534e5f4d41494e');
    expect(
      Buffer.from(StarknetChainId.SN_MAIN.slice(2), 'hex').toString('ascii'),
    ).toBe('SN_MAIN');
  });

  it('encodes sepolia as the felt for SN_SEPOLIA', () => {
    expect(StarknetChainId.SN_SEPOLIA).toBe('0x534e5f5345504f4c4941');
    expect(
      Buffer.from(StarknetChainId.SN_SEPOLIA.slice(2), 'hex').toString('ascii'),
    ).toBe('SN_SEPOLIA');
  });

  it('offers exactly two networks', () => {
    expect(Object.keys(StarknetChainId).sort()).toEqual([
      'SN_MAIN',
      'SN_SEPOLIA',
    ]);
  });
});

describe('StarknetChain', () => {
  it('uses the namespaced human-readable form', () => {
    expect(StarknetChain.Mainnet).toBe('starknet:mainnet');
    expect(StarknetChain.Sepolia).toBe('starknet:sepolia');
  });
});

describe('makeDestinationChainId', () => {
  /** The function returns a decimal string; read it back as hex to assert on shape. */
  function asHex(chainId: `0x${string}`): string {
    return BigInt(makeDestinationChainId(chainId)).toString(16);
  }

  it('returns a decimal string, not hex', () => {
    const result = makeDestinationChainId(StarknetChainId.SN_MAIN);

    expect(result).toMatch(/^[0-9]+$/);
  });

  // The prefix is what marks the destination as a Starknet chain. It is the
  // whole point of the function.
  it('prefixes the chain id with the 0x04 type byte', () => {
    expect(asHex(StarknetChainId.SN_MAIN).startsWith('4')).toBe(true);
    expect(asHex(StarknetChainId.SN_SEPOLIA).startsWith('4')).toBe(true);
  });

  it('produces a 32-byte value', () => {
    // 63 hex digits once the leading zero of the 0x04 byte is dropped by BigInt.
    expect(asHex(StarknetChainId.SN_MAIN)).toHaveLength(63);
    expect(asHex(StarknetChainId.SN_SEPOLIA)).toHaveLength(63);
  });

  it('preserves the chain id in the low bytes', () => {
    const hex = asHex(StarknetChainId.SN_MAIN);

    expect(hex.endsWith('534e5f4d41494e')).toBe(true);
  });

  it('gives the two networks different destinations', () => {
    expect(makeDestinationChainId(StarknetChainId.SN_MAIN)).not.toBe(
      makeDestinationChainId(StarknetChainId.SN_SEPOLIA),
    );
  });

  it('is deterministic', () => {
    expect(makeDestinationChainId(StarknetChainId.SN_MAIN)).toBe(
      makeDestinationChainId(StarknetChainId.SN_MAIN),
    );
  });

  it('pins the exact mainnet destination value', () => {
    // Locked deliberately: the mint contract and the signed message both carry
    // this number, so it cannot drift silently.
    expect(makeDestinationChainId(StarknetChainId.SN_MAIN)).toBe(
      BigInt('0x04' + '534e5f4d41494e'.padStart(62, '0')).toString(10),
    );
  });

  it('handles a zero chain id', () => {
    expect(asHex('0x0')).toBe('4' + '0'.repeat(62));
  });

  // The implementation pads to 64 hex digits and then slices two off the front,
  // so a chain id needing more than 62 digits loses its top bytes rather than
  // failing. No real Starknet chain id is that large, but the boundary is worth
  // recording so a future caller does not assume it is safe.
  it('truncates a chain id wider than 62 hex digits', () => {
    const oversized = `0x${'f'.repeat(64)}` as const;

    expect(asHex(oversized)).toBe('4' + 'f'.repeat(62));
  });
});
