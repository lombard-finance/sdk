import { describe, expect, it } from 'vitest';

import { getChainConfig } from '../../../chains/btc/actions/stake/config';
import { Chain } from '../../../core';

describe('ChainConfig', () => {
  it('should return EVM config for EVM chain type', () => {
    const config = getChainConfig('evm');
    expect(config).toBeDefined();
    expect(config?.chainType).toBe('evm');
    expect(config?.destChains).toContain(Chain.ETHEREUM);
  });

  it('should return Solana config for Solana chain type', () => {
    const config = getChainConfig('solana');
    expect(config).toBeDefined();
    expect(config?.chainType).toBe('solana');
  });

  it('should return undefined for invalid chain type', () => {
    // @ts-expect-error Testing invalid input
    const config = getChainConfig('invalid');
    expect(config).toBeUndefined();
  });

  describe('Address Validation', () => {
    it('should validate EVM addresses', () => {
      const config = getChainConfig('evm');
      const validAddr = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      const invalidAddr = 'invalid';

      expect(() => config?.addressSchema.parse(validAddr)).not.toThrow();
      expect(() => config?.addressSchema.parse(invalidAddr)).toThrow();
    });

    it('should validate Solana addresses', () => {
      const config = getChainConfig('solana');
      // A valid base58 address
      const validAddr = '5U3bH5b6XtG99aV6ce2ifLkLXLkHeHuAy46sDjr9Gf3C';
      const invalidAddr = 'invalid';

      expect(() => config?.addressSchema.parse(validAddr)).not.toThrow();
      expect(() => config?.addressSchema.parse(invalidAddr)).toThrow();
    });
  });
});
