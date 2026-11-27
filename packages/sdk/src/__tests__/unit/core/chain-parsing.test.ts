/**
 * Chain Parsing Tests
 *
 * Tests for parseChainIdentifier function to ensure proper handling of
 * CAIP-2 chain identifiers for all supported chain types.
 *
 * Covers:
 * - Solana genesis hash → network name mapping
 * - Sui chain ID validation (full CAIP-2 format)
 * - Starknet network name → hex chain ID mapping
 *
 * @module __tests__/unit/core/chain-parsing.test.ts
 */

import { describe, expect, it } from 'vitest';

import {
  ChainId,
  isSolanaChain,
  isStarknetChainId,
  isSuiChain,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  SUI_DEVNET_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
} from '../../../common/chains';
import { Chain, parseChainIdentifier } from '../../../core';

describe('parseChainIdentifier', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // EVM Chain Parsing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('EVM chains (eip155:*)', () => {
    it('should parse Ethereum mainnet', () => {
      const result = parseChainIdentifier(Chain.ETHEREUM);
      expect(result).toBe(ChainId.ethereum);
    });

    it('should parse Avalanche mainnet', () => {
      const result = parseChainIdentifier(Chain.AVALANCHE);
      expect(result).toBe(ChainId.avalanche);
    });

    it('should parse Base mainnet', () => {
      const result = parseChainIdentifier(Chain.BASE);
      expect(result).toBe(ChainId.base);
    });

    it('should parse Sepolia testnet', () => {
      const result = parseChainIdentifier(Chain.SEPOLIA);
      expect(result).toBe(ChainId.sepolia);
    });

    it('should throw for invalid EVM chain ID', () => {
      expect(() => {
        parseChainIdentifier('eip155:99999999' as Chain);
      }).toThrow('Invalid EVM chain');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Solana Chain Parsing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Solana chains (solana:*)', () => {
    /**
     * CAIP-2 Solana chains use genesis hash references
     * (e.g., 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' for mainnet),
     * but the Solana SDK expects network names ('solana:mainnet-beta').
     *
     * The SDK maps genesis hash references to their corresponding network names.
     */

    describe('Legacy format (network names)', () => {
      it('should parse mainnet-beta', () => {
        const result = parseChainIdentifier(
          SOLANA_MAINNET_CHAIN as unknown as Chain,
        );
        expect(result).toBe(SOLANA_MAINNET_CHAIN);
        expect(isSolanaChain(result)).toBe(true);
      });

      it('should parse devnet', () => {
        const result = parseChainIdentifier(
          SOLANA_DEVNET_CHAIN as unknown as Chain,
        );
        expect(result).toBe(SOLANA_DEVNET_CHAIN);
        expect(isSolanaChain(result)).toBe(true);
      });

      it('should parse testnet', () => {
        const result = parseChainIdentifier(
          SOLANA_TESTNET_CHAIN as unknown as Chain,
        );
        expect(result).toBe(SOLANA_TESTNET_CHAIN);
        expect(isSolanaChain(result)).toBe(true);
      });
    });

    describe('CAIP-2 format (genesis hash references)', () => {
      it('should map mainnet genesis hash to mainnet-beta', () => {
        // CAIP-2 mainnet: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
        const result = parseChainIdentifier(
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as Chain,
        );
        expect(result).toBe(SOLANA_MAINNET_CHAIN);
      });

      it('should map devnet genesis hash to devnet', () => {
        // CAIP-2 devnet: solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
        const result = parseChainIdentifier(
          'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1' as Chain,
        );
        expect(result).toBe(SOLANA_DEVNET_CHAIN);
      });

      it('should map testnet genesis hash to testnet', () => {
        // CAIP-2 testnet: solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z
        const result = parseChainIdentifier(
          'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z' as Chain,
        );
        expect(result).toBe(SOLANA_TESTNET_CHAIN);
      });
    });

    it('should throw for invalid Solana chain reference', () => {
      expect(() => {
        parseChainIdentifier('solana:invalid-reference' as Chain);
      }).toThrow('Invalid Solana chain');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sui Chain Parsing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Sui chains (sui:*)', () => {
    /**
     * isSuiChain expects the full CAIP-2 chain ID ('sui:testnet'),
     * not just the network part ('testnet').
     */

    it('should parse sui:mainnet', () => {
      const result = parseChainIdentifier(
        SUI_MAINNET_CHAIN as unknown as Chain,
      );
      expect(result).toBe(SUI_MAINNET_CHAIN);
      expect(isSuiChain(result)).toBe(true);
    });

    it('should parse sui:testnet', () => {
      const result = parseChainIdentifier(
        SUI_TESTNET_CHAIN as unknown as Chain,
      );
      expect(result).toBe(SUI_TESTNET_CHAIN);
      expect(isSuiChain(result)).toBe(true);
    });

    it('should parse sui:devnet', () => {
      const result = parseChainIdentifier(SUI_DEVNET_CHAIN as unknown as Chain);
      expect(result).toBe(SUI_DEVNET_CHAIN);
      expect(isSuiChain(result)).toBe(true);
    });

    it('should throw for invalid Sui chain', () => {
      expect(() => {
        parseChainIdentifier('sui:invalid' as Chain);
      }).toThrow('Invalid Sui chain');
    });

    describe('isSuiChain validation', () => {
      it('should return true for valid Sui chains', () => {
        expect(isSuiChain(SUI_MAINNET_CHAIN)).toBe(true);
        expect(isSuiChain(SUI_TESTNET_CHAIN)).toBe(true);
        expect(isSuiChain(SUI_DEVNET_CHAIN)).toBe(true);
      });

      it('should return false for just network name (the original bug)', () => {
        // Before the fix, 'testnet' was passed instead of 'sui:testnet'
        expect(isSuiChain('testnet')).toBe(false);
        expect(isSuiChain('mainnet')).toBe(false);
        expect(isSuiChain('devnet')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Starknet Chain Parsing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Starknet chains (starknet:*)', () => {
    /**
     * CAIP-2 uses human-readable network names (SN_MAIN, SN_SEPOLIA),
     * but Starknet SDK expects hex-encoded chain IDs.
     *
     * The SDK maps network names to their corresponding hex chain IDs.
     */

    it('should parse mainnet (SN_MAIN) to hex chain ID', () => {
      const result = parseChainIdentifier('starknet:SN_MAIN' as Chain);
      expect(result).toBe(STARKNET_MAINNET_CHAIN);
      expect(result).toBe('0x534e5f4d41494e'); // hex of "SN_MAIN"
      expect(isStarknetChainId(result)).toBe(true);
    });

    it('should parse sepolia (SN_SEPOLIA) to hex chain ID', () => {
      const result = parseChainIdentifier('starknet:SN_SEPOLIA' as Chain);
      expect(result).toBe(STARKNET_SEPOLIA_CHAIN);
      expect(result).toBe('0x534e5f5345504f4c4941'); // hex of "SN_SEPOLIA"
      expect(isStarknetChainId(result)).toBe(true);
    });

    it('should throw for invalid Starknet network', () => {
      expect(() => {
        parseChainIdentifier('starknet:invalid' as Chain);
      }).toThrow('Invalid Starknet chain');
    });

    describe('isStarknetChainId validation', () => {
      it('should return true for valid hex chain IDs', () => {
        expect(isStarknetChainId(STARKNET_MAINNET_CHAIN)).toBe(true);
        expect(isStarknetChainId(STARKNET_SEPOLIA_CHAIN)).toBe(true);
      });

      it('should return false for network names (the original bug)', () => {
        // Network names need to be converted to hex chain IDs
        expect(isStarknetChainId('SN_MAIN')).toBe(false);
        expect(isStarknetChainId('SN_SEPOLIA')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Error Handling
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error handling', () => {
    it('should throw for unknown chain prefix', () => {
      expect(() => {
        parseChainIdentifier('unknown:12345' as Chain);
      }).toThrow('Invalid chain');
    });

    it('should throw for malformed chain identifier', () => {
      expect(() => {
        parseChainIdentifier('not-a-valid-chain' as Chain);
      }).toThrow('Invalid chain');
    });
  });
});
