/**
 * Bitcoin address validation, on the two cases where "decodes" and "is a
 * destination we can pay" are not the same thing.
 *
 * `bitcoinAddressSchema` is the recipient schema for every unstake and redeem
 * action, and `getOutputScript` turns what it accepts into the script the
 * redemption pays to.
 */

import { getOutputScript } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import {
  bitcoinAddressSchema,
  isValidBitcoinAddress,
} from '../../../shared/validation';

/** Real, checksum-valid addresses, one per form. */
const MAINNET = {
  p2pkh: '12ZEw5Hcv1hTb6YUQJ69y1V7uhcoDz92PH',
  p2sh: '33FFrcn4Tv1qgGEuXPkkPdr44DuWp3RzPo',
  p2wpkh: 'bc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3h8ffkz',
  p2wpkhUpper: 'BC1QZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3H8FFKZ',
  p2wsh: 'bc1qyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3qrkjgc9',
  p2tr: 'bc1pmfr3p9j00pfxjh0zmgp99y8zftmd3s5pmedqhyptwy6lm87hf5sspknck9',
  /**
   * Witness version 2, from the BIP-173 test vectors. Valid bech32m, and an
   * output for it is spendable by anyone once mined.
   */
  witnessV2: 'bc1zxvenxvenxvenxvenxvenxvenxv8al9f3',
};

const TESTNET = {
  p2wpkh: 'tb1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3apj6d3',
};

/**
 * Checksum-valid bech32 with a human-readable part that is not Bitcoin's.
 *
 * `bcrt` is regtest, which `getOutputScript` never selects, and `ltc` is
 * another chain entirely. Both decode cleanly at witness version 0, so only
 * the prefix separates them from an address this SDK can pay.
 */
const FOREIGN_HRP = {
  regtest: 'bcrt1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3lgth6c',
  litecoin: 'ltc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3nmndwj',
};

describe('isValidBitcoinAddress', () => {
  it.each([
    ['P2PKH', MAINNET.p2pkh],
    ['P2SH', MAINNET.p2sh],
    ['P2WPKH', MAINNET.p2wpkh],
    ['P2WSH', MAINNET.p2wsh],
    ['P2TR', MAINNET.p2tr],
    ['a testnet P2WPKH', TESTNET.p2wpkh],
  ])('accepts %s', (_label, address) => {
    expect(isValidBitcoinAddress(address)).toBe(true);
  });

  // BIP-173 defines the all-uppercase form as equally valid, and
  // `toOutputScript` pays it. Deciding by lowercase prefix rejected it.
  it('accepts the all-uppercase bech32 form', () => {
    expect(isValidBitcoinAddress(MAINNET.p2wpkhUpper)).toBe(true);
  });

  // Not a payable destination, whatever bech32m says about it.
  it('rejects a future witness version', () => {
    expect(isValidBitcoinAddress(MAINNET.witnessV2)).toBe(false);
  });

  /**
   * Decoding says the string is well formed, not that it names a network this
   * SDK builds outputs for. Both of these are checksum-valid at witness
   * version 0, so the prefix is the only thing that separates them from an
   * address that can be paid — `getOutputScript` selects between mainnet and
   * testnet only, and would refuse them later.
   */
  it.each([
    ['a regtest address', FOREIGN_HRP.regtest],
    ["another chain's address", FOREIGN_HRP.litecoin],
  ])('rejects %s', (_label, address) => {
    expect(isValidBitcoinAddress(address)).toBe(false);
    expect(bitcoinAddressSchema.safeParse(address).success).toBe(false);
  });

  it.each([
    ['an empty string', ''],
    ['mixed-case bech32', 'bc1qzyG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3H8FFKZ'],
    ['a bad bech32 checksum', 'bc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3h8ffkq'],
    ['a taproot address in bech32 rather than bech32m',
      'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqh2y7hd'],
    ['an EVM address', '0x1111111111111111111111111111111111111111'],
    ['prose', 'send it to my wallet'],
  ])('rejects %s', (_label, address) => {
    expect(isValidBitcoinAddress(address)).toBe(false);
  });

  it('is what the recipient schema enforces', () => {
    expect(bitcoinAddressSchema.safeParse(MAINNET.witnessV2).success).toBe(
      false,
    );
    expect(bitcoinAddressSchema.safeParse(MAINNET.p2wpkhUpper).success).toBe(
      true,
    );
  });
});

describe('getOutputScript', () => {
  it.each([
    ['P2WPKH', MAINNET.p2wpkh, '0x00141111111111111111111111111111111111111111'],
    [
      'P2TR',
      MAINNET.p2tr,
      '0x5120da4710964f7852695de2da025290e24af6d8c281de5a0b902b7135fd9fd74d21',
    ],
    ['P2PKH', MAINNET.p2pkh, '0x76a914111111111111111111111111111111111111111188ac'],
    ['P2SH', MAINNET.p2sh, '0xa914111111111111111111111111111111111111111187'],
  ])('builds the %s script', async (_label, address, expected) => {
    await expect(getOutputScript(address, Env.prod)).resolves.toBe(expected);
  });

  /**
   * bitcoinjs-lib compiles `OP_2 <program>` for this and warns on the console,
   * which is not a check. The redemption would pay to an output nobody
   * legitimately controls.
   */
  it('refuses a future witness version rather than paying to it', async () => {
    await expect(
      getOutputScript(MAINNET.witnessV2, Env.prod),
    ).rejects.toThrow(/witness version 2/);
  });

  it('names why, so a caller can tell it from a malformed address', async () => {
    await expect(
      getOutputScript(MAINNET.witnessV2, Env.prod),
    ).rejects.toThrow(/spent by anyone/);
  });

  // Unchanged behaviour, asserted so the version guard cannot be mistaken for
  // the network check.
  it.each([
    ['a testnet address under prod', TESTNET.p2wpkh, Env.prod],
    ['a mainnet address under testnet', MAINNET.p2wpkh, Env.testnet],
  ])('still refuses %s', async (_label, address, env) => {
    await expect(getOutputScript(address, env)).rejects.toThrow();
  });
});
