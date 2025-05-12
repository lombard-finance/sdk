import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WALLET_NOT_FOUND_ERROR } from '../../const/errors';
import {
  getWalletProvider,
  isWalletAvailable,
  isWindowAvailable,
} from './detectWallet';

describe('detectWallet utilities', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // Mock window object
    vi.stubGlobal('window', {
      phantom: {
        solana: {
          isPhantom: true,
          connect: vi.fn(),
          disconnect: vi.fn(),
          isConnected: false,
          publicKey: null,
          signMessage: vi.fn(),
          signTransaction: vi.fn(),
          signAllTransactions: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    // Restore original window
    vi.stubGlobal('window', originalWindow);
    vi.clearAllMocks();
  });

  describe('isWindowAvailable', () => {
    it('should return true when window is available', () => {
      expect(isWindowAvailable()).toBe(true);
    });

    it('should return false when window is not available', () => {
      vi.stubGlobal('window', undefined);
      expect(isWindowAvailable()).toBe(false);
    });
  });

  describe('isWalletAvailable', () => {
    it('should return true if phantom wallet is available', () => {
      expect(isWalletAvailable('phantom')).toBe(true);
    });

    it('should return false if okx wallet is not available', () => {
      expect(isWalletAvailable('okx')).toBe(false);
    });

    it('should return false if window is not available', () => {
      vi.stubGlobal('window', undefined);
      expect(isWalletAvailable('phantom')).toBe(false);
    });
  });

  describe('getWalletProvider', () => {
    it('should return phantom provider if available', () => {
      const provider = getWalletProvider('phantom');
      expect(provider).toBeDefined();
      expect(provider.solana).toBeDefined();
      expect(provider.solana.isPhantom).toBe(true);
    });

    it('should throw WALLET_NOT_FOUND_ERROR if wallet is not available', () => {
      expect(() => getWalletProvider('okx')).toThrow(
        WALLET_NOT_FOUND_ERROR.message,
      );
    });
  });
});
