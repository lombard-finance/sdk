/**
 * Tests for Zod schemas
 *
 * Validates that schemas accept correct input and reject invalid data.
 */

import { describe, expect, it } from 'vitest';

import {
  DeploySchema,
  DepositSchema,
  RedeemSchema,
  StakeSchema,
  UnstakeSchema,
} from '../schemas';

describe('StakeSchema', () => {
  it('accepts valid stake input', () => {
    const result = StakeSchema.safeParse({ amount: '0.5' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ amount: '0.5' });
  });

  it('rejects missing amount', () => {
    const result = StakeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-string amount', () => {
    const result = StakeSchema.safeParse({ amount: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects amount below minimum (0.0002)', () => {
    const result = StakeSchema.safeParse({ amount: '0.0001' });
    expect(result.success).toBe(false);
  });

  it('accepts amount at minimum (0.0002)', () => {
    const result = StakeSchema.safeParse({ amount: '0.0002' });
    expect(result.success).toBe(true);
  });

  it('strips unknown fields', () => {
    const result = StakeSchema.safeParse({ amount: '1', extra: 'ignored' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ amount: '1' });
  });
});

describe('UnstakeSchema', () => {
  it('accepts valid unstake to BTC.b', () => {
    const result = UnstakeSchema.safeParse({
      amount: '0.5',
      recipient: '0x1234567890abcdef1234567890abcdef12345678',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      amount: '0.5',
      recipient: '0x1234567890abcdef1234567890abcdef12345678',
    });
  });

  it('rejects non-EVM recipient address', () => {
    const result = UnstakeSchema.safeParse({
      amount: '1.0',
      recipient: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing recipient', () => {
    const result = UnstakeSchema.safeParse({
      amount: '1',
    });
    expect(result.success).toBe(false);
  });
});

describe('DepositSchema', () => {
  it('accepts valid deposit', () => {
    const result = DepositSchema.safeParse({
      amount: '0.25',
      recipient: '0x1234567890abcdef1234567890abcdef12345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid EVM address', () => {
    const result = DepositSchema.safeParse({
      amount: '1',
      recipient: 'not-an-address',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing recipient', () => {
    const result = DepositSchema.safeParse({
      amount: '1',
    });
    expect(result.success).toBe(false);
  });
});

describe('RedeemSchema', () => {
  it('accepts valid redeem input', () => {
    const result = RedeemSchema.safeParse({
      amount: '0.1',
      recipient: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing amount', () => {
    const result = RedeemSchema.safeParse({
      recipient: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    });
    expect(result.success).toBe(false);
  });
});

describe('DeploySchema', () => {
  it('accepts valid veda deploy', () => {
    const result = DeploySchema.safeParse({
      amount: '0.5',
      protocol: 'veda',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ amount: '0.5', protocol: 'veda' });
  });

  it('accepts valid silo deploy', () => {
    const result = DeploySchema.safeParse({
      amount: '1',
      protocol: 'silo',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unsupported protocol', () => {
    const result = DeploySchema.safeParse({
      amount: '1',
      protocol: 'aave',
    });
    expect(result.success).toBe(false);
  });

  it('strips unknown fields', () => {
    const result = DeploySchema.safeParse({
      amount: '1',
      protocol: 'veda',
      slippage: 0.01,
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ amount: '1', protocol: 'veda' });
  });
});
