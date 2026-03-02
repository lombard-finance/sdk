/**
 * Tests for LombardActionProvider
 *
 * Verifies supportsNetwork filtering and action method contracts.
 */

import { describe, expect, it } from 'vitest';

import { LombardActionProvider } from '../lombardActionProvider';

function makeNetwork(protocolFamily: string, chainId?: string) {
  return { protocolFamily, chainId };
}

describe('LombardActionProvider', () => {
  const provider = new LombardActionProvider();

  describe('supportsNetwork', () => {
    it('returns true for Avalanche', () => {
      expect(provider.supportsNetwork(makeNetwork('evm', '43114'))).toBe(true);
    });

    it('returns true for Katana', () => {
      expect(provider.supportsNetwork(makeNetwork('evm', '747474'))).toBe(true);
    });

    it('returns true for MegaETH', () => {
      expect(provider.supportsNetwork(makeNetwork('evm', '4326'))).toBe(true);
    });

    it('returns true for Stable', () => {
      expect(provider.supportsNetwork(makeNetwork('evm', '988'))).toBe(true);
    });

    it('returns true for Sepolia testnet', () => {
      expect(provider.supportsNetwork(makeNetwork('evm', '11155111'))).toBe(
        true,
      );
    });

    it('returns true for Avalanche Fuji testnet', () => {
      expect(provider.supportsNetwork(makeNetwork('evm', '43113'))).toBe(true);
    });

    it('returns true for Ethereum', () => {
      expect(provider.supportsNetwork(makeNetwork('evm', '1'))).toBe(true);
    });

    it('returns false for Base (no BTC.b)', () => {
      expect(provider.supportsNetwork(makeNetwork('evm', '8453'))).toBe(false);
    });

    it('returns false for unsupported EVM chain', () => {
      expect(provider.supportsNetwork(makeNetwork('evm', '42161'))).toBe(
        false,
      ); // Arbitrum
    });

    it('returns false for Solana', () => {
      expect(provider.supportsNetwork(makeNetwork('solana', '1'))).toBe(false);
    });

    it('returns false when chainId is undefined', () => {
      expect(provider.supportsNetwork(makeNetwork('evm'))).toBe(false);
    });
  });

  describe('provider metadata', () => {
    it('has name "lombard"', () => {
      expect(provider.name).toBe('lombard');
    });
  });
});
