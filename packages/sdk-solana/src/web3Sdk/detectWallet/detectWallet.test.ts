import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InjectedWallet } from '../../types/walletProviders';
import { getSolanaWalletProvider } from './detectWallet';

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

  describe('getSolanaWalletProvider', () => {
    it.each([InjectedWallet.PHANTOM])(
      'should return a solana wallet provider if available',
      wallet => {
        const provider = getSolanaWalletProvider(wallet);
        expect(provider).toBeDefined();
      },
    );

    it.each([InjectedWallet.COINBASE, InjectedWallet.OKX])(
      'should throw if wallet is not available',
      wallet => {
        expect(() => getSolanaWalletProvider(wallet)).toThrow();
      },
    );
  });
});
