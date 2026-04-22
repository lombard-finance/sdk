import { describe, expect, it } from 'vitest';

import { BTC_NATIVE_TOKEN_ADDRESS, validateAmount } from './shared';

describe('validateAmount', () => {
  it('should accept valid positive integer strings', () => {
    expect(() => validateAmount('1')).not.toThrow();
    expect(() => validateAmount('100000')).not.toThrow();
    expect(() => validateAmount('18446744073709551615')).not.toThrow(); // u64 max
  });

  it('should reject zero', () => {
    expect(() => validateAmount('0')).toThrow('greater than zero');
  });

  it('should reject non-numeric strings', () => {
    expect(() => validateAmount('abc')).toThrow('positive integer string');
    expect(() => validateAmount('1.5')).toThrow('positive integer string');
    expect(() => validateAmount('-1')).toThrow('positive integer string');
    expect(() => validateAmount('')).toThrow('positive integer string');
    expect(() => validateAmount(' 100')).toThrow('positive integer string');
  });

  it('should reject amounts exceeding u64 max', () => {
    expect(() => validateAmount('18446744073709551616')).toThrow('exceeds the u64 maximum');
    expect(() => validateAmount('99999999999999999999999')).toThrow('exceeds the u64 maximum');
  });
});

describe('BTC_NATIVE_TOKEN_ADDRESS', () => {
  it('should be a 32-byte buffer', () => {
    expect(BTC_NATIVE_TOKEN_ADDRESS).toBeInstanceOf(Buffer);
    expect(BTC_NATIVE_TOKEN_ADDRESS.length).toBe(32);
  });

  it('should have value 1 in the last byte', () => {
    expect(BTC_NATIVE_TOKEN_ADDRESS[31]).toBe(1);
  });

  it('should have all other bytes as zero', () => {
    for (let i = 0; i < 31; i++) {
      expect(BTC_NATIVE_TOKEN_ADDRESS[i]).toBe(0);
    }
  });
});
