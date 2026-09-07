/**
 * BTC address classification and output-script derivation
 *
 * `getOutputScript` produces the script a redemption pays out to, so a wrong
 * network here sends funds to an address the user does not control. The env
 * mapping is asserted per environment rather than just for prod, because four
 * of the five environments share one branch.
 */

import { describe, expect, it } from 'vitest';

import { Env } from '../env';
import { BtcAddressType, getBtcAddressType } from './btc-address-type';
import { getOutputScript } from './get-output-script';

// Well-known vectors. The mainnet P2WPKH and P2WSH addresses are the BIP-173
// examples; the taproot address is the BIP-86 first-key example.
const MAINNET_P2WPKH = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
const MAINNET_P2WSH =
  'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';
const MAINNET_P2TR =
  'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr';
const TESTNET_P2WPKH = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
const MAINNET_P2PKH = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

describe('getBtcAddressType', () => {
  it('classifies a 20-byte witness v0 program as p2wpkh', () => {
    expect(getBtcAddressType(MAINNET_P2WPKH)).toBe(BtcAddressType.p2wpkh);
  });

  it('classifies a 32-byte witness v0 program as p2wsh', () => {
    expect(getBtcAddressType(MAINNET_P2WSH)).toBe(BtcAddressType.p2wsh);
  });

  it('classifies a 32-byte witness v1 program as p2tr', () => {
    expect(getBtcAddressType(MAINNET_P2TR)).toBe(BtcAddressType.p2tr);
  });

  it('classifies testnet addresses by program, not by prefix', () => {
    expect(getBtcAddressType(TESTNET_P2WPKH)).toBe(BtcAddressType.p2wpkh);
  });

  it('rejects a legacy base58 address', () => {
    // Not the function's own 'Invalid BTC address' message: bech32 decoding
    // fails first. Worth knowing when reading a support report.
    expect(() => getBtcAddressType(MAINNET_P2PKH)).toThrow();
  });

  it('rejects a malformed address', () => {
    expect(() => getBtcAddressType('not-an-address')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => getBtcAddressType('')).toThrow();
  });

  it('exposes exactly the three types it can return', () => {
    expect(Object.values(BtcAddressType).sort()).toEqual([
      'p2tr',
      'p2wpkh',
      'p2wsh',
    ]);
  });
});

describe('getOutputScript', () => {
  it('derives a v0 witness script with the 0x0014 prefix', async () => {
    const script = await getOutputScript(MAINNET_P2WPKH, Env.prod);

    expect(script).toMatch(/^0x0014[0-9a-f]{40}$/);
  });

  it('derives a v1 witness script with the 0x5120 prefix', async () => {
    const script = await getOutputScript(MAINNET_P2TR, Env.prod);

    expect(script).toMatch(/^0x5120[0-9a-f]{64}$/);
  });

  it('derives a p2wsh script', async () => {
    const script = await getOutputScript(MAINNET_P2WSH, Env.prod);

    expect(script).toMatch(/^0x0020[0-9a-f]{64}$/);
  });

  it('defaults to mainnet when no env is given', async () => {
    await expect(getOutputScript(MAINNET_P2WPKH)).resolves.toMatch(/^0x0014/);
    await expect(getOutputScript(TESTNET_P2WPKH)).rejects.toThrow();
  });

  // The implementation is `env === Env.prod ? bitcoin : testnet`, so every
  // non-prod environment resolves to the testnet network. A prod caller who
  // passes 'stage' would otherwise silently accept a testnet address.
  it('accepts a mainnet address only under prod', async () => {
    await expect(getOutputScript(MAINNET_P2WPKH, Env.prod)).resolves.toMatch(
      /^0x0014/,
    );

    for (const env of [Env.testnet, Env.stage, Env.dev, Env.ibc]) {
      await expect(
        getOutputScript(MAINNET_P2WPKH, env),
        `${env} must reject a mainnet address`,
      ).rejects.toThrow();
    }
  });

  it('accepts a testnet address under every non-prod environment', async () => {
    for (const env of [Env.testnet, Env.stage, Env.dev, Env.ibc]) {
      await expect(
        getOutputScript(TESTNET_P2WPKH, env),
        `${env} must accept a testnet address`,
      ).resolves.toMatch(/^0x0014/);
    }
  });

  it('rejects a mainnet address under prod if it is malformed', async () => {
    await expect(getOutputScript('bc1qinvalid', Env.prod)).rejects.toThrow();
  });

  it('returns lowercase hex with a single 0x prefix', async () => {
    const script = await getOutputScript(MAINNET_P2TR, Env.prod);

    expect(script.startsWith('0x')).toBe(true);
    expect(script.slice(2)).toBe(script.slice(2).toLowerCase());
    expect(script.slice(2)).not.toContain('0x');
  });
});
