/**
 * Denomination conversion
 *
 * `sdk-common` ships to 5.0.0 in this release with no tests at all, while
 * holding the conversion every amount passes through on its way to a contract
 * call. These are the assertions that make a rounding change visible.
 */

import BigNumber from 'bignumber.js';
import { describe, expect, it } from 'vitest';

import { fromBaseDenomination, toBaseDenomination } from './numbers';

const BTC = 8;
const ETH = 18;

describe('toBaseDenomination', () => {
  it.each([
    ['1', BTC, '100000000'],
    ['0.00000001', BTC, '1'],
    ['0.12345678', BTC, '12345678'],
    ['0', BTC, '0'],
    ['21000000', BTC, '2100000000000000'],
    ['1', ETH, '1000000000000000000'],
    ['0.000000000000000001', ETH, '1'],
  ])('converts %s at %i decimals to %s', (input, decimals, expected) => {
    expect(toBaseDenomination(input, decimals).toFixed()).toBe(expected);
  });

  it('accepts a number as well as a string', () => {
    expect(toBaseDenomination(1.5, BTC).toFixed()).toBe('150000000');
  });

  it('accepts a BigNumber', () => {
    expect(toBaseDenomination(new BigNumber('2.5'), BTC).toFixed()).toBe(
      '250000000',
    );
  });

  // ROUND_HALF_UP, not truncation. A change here silently moves money, so both
  // sides of the boundary are pinned.
  it('rounds a half up', () => {
    expect(toBaseDenomination('0.000000005', BTC).toFixed()).toBe('1');
  });

  it('rounds below a half down', () => {
    expect(toBaseDenomination('0.0000000049', BTC).toFixed()).toBe('0');
  });

  it('rounds above a half up', () => {
    expect(toBaseDenomination('0.0000000051', BTC).toFixed()).toBe('1');
  });

  it('always returns a whole number', () => {
    expect(toBaseDenomination('0.123456789', BTC).decimalPlaces()).toBe(0);
  });

  it('handles zero decimals as a passthrough', () => {
    expect(toBaseDenomination('42', 0).toFixed()).toBe('42');
  });

  it('keeps precision that a float would lose', () => {
    // 0.1 + 0.2 in binary floating point is 0.30000000000000004; the BigNumber
    // path must not reproduce that.
    expect(toBaseDenomination('0.3', ETH).toFixed()).toBe('300000000000000000');
  });

  it('preserves a negative sign rather than clamping', () => {
    expect(toBaseDenomination('-1', BTC).toFixed()).toBe('-100000000');
  });
});

describe('fromBaseDenomination', () => {
  it.each([
    ['100000000', BTC, '1'],
    ['1', BTC, '0.00000001'],
    ['12345678', BTC, '0.12345678'],
    ['0', BTC, '0'],
    ['1000000000000000000', ETH, '1'],
  ])('converts %s at %i decimals to %s', (input, decimals, expected) => {
    expect(fromBaseDenomination(input, decimals).toFixed()).toBe(expected);
  });

  // Unlike the forward direction there is no rounding here, so sub-unit input
  // keeps its fraction instead of collapsing to zero.
  it('does not round, so a fractional base unit survives', () => {
    expect(fromBaseDenomination('0.5', BTC).toFixed()).toBe('0.000000005');
  });
});

describe('the two directions together', () => {
  it.each(['1', '0.00000001', '0.12345678', '21000000'])(
    'round-trips %s at BTC precision',
    (amount) => {
      expect(
        fromBaseDenomination(toBaseDenomination(amount, BTC), BTC).toFixed(),
      ).toBe(amount);
    },
  );

  it('round-trips at ETH precision', () => {
    const amount = '1.000000000000000001';
    expect(
      fromBaseDenomination(toBaseDenomination(amount, ETH), ETH).toFixed(),
    ).toBe(amount);
  });
});
