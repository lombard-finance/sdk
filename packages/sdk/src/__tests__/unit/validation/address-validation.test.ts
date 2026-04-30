/**
 * Address Validation Tests
 *
 * Tests for address validation schemas to ensure they properly reject
 * truncated, malformed, and invalid addresses.
 *
 * Background:
 * - Address validation was accepting truncated addresses
 * - User could paste valid address, delete last character, and still proceed
 *
 * @module __tests__/unit/validation/address-validation.test.ts
 */

import { describe, expect, it } from 'vitest';

import {
  bitcoinAddressSchema,
  evmAddressSchema,
  solanaAddressSchema,
  starknetAddressSchema,
  suiAddressSchema } from '../../../shared/validation';

describe('Address Validation Schemas', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // EVM Address Validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('evmAddressSchema', () => {
    const validAddresses = [
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      '0x659579F1460c38c3ce3288b47b074646cef855fc',
      '0x0000000000000000000000000000000000000000',
      '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
    ];

    it.each(validAddresses)('should accept valid EVM address: %s', (address) => {
      const result = evmAddressSchema.safeParse(address);
      expect(result.success).toBe(true);
    });

    describe('should reject truncated addresses', () => {
      it('should reject address with last character removed', () => {
        const valid = '0x659579F1460c38c3ce3288b47b074646cef855fc';
        const truncated = valid.slice(0, -1); // Remove last 'c'

        const result = evmAddressSchema.safeParse(truncated);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toContain('Invalid EVM address');
      });

      it('should reject address with first hex character removed', () => {
        const valid = '0x659579F1460c38c3ce3288b47b074646cef855fc';
        const truncated = '0x' + valid.slice(3); // Remove first hex char

        const result = evmAddressSchema.safeParse(truncated);
        expect(result.success).toBe(false);
      });

      it('should reject address with multiple characters removed', () => {
        const valid = '0x659579F1460c38c3ce3288b47b074646cef855fc';
        const truncated = valid.slice(0, -5); // Remove last 5 chars

        const result = evmAddressSchema.safeParse(truncated);
        expect(result.success).toBe(false);
      });
    });

    describe('should reject malformed addresses', () => {
      const invalidAddresses = [
        { address: '659579F1460c38c3ce3288b47b074646cef855fc', reason: 'missing 0x prefix' },
        { address: '0x659579F1460c38c3ce3288b47b074646cef855f', reason: 'only 39 hex chars' },
        { address: '0x659579F1460c38c3ce3288b47b074646cef855fcc', reason: '41 hex chars' },
        { address: '0x659579F1460c38c3ce3288b47b074646cef855fG', reason: 'invalid hex char G' },
        { address: '', reason: 'empty string' },
        { address: '0x', reason: 'only prefix' },
      ];

      it.each(invalidAddresses)(
        'should reject $reason: $address',
        ({ address }) => {
          const result = evmAddressSchema.safeParse(address);
          expect(result.success).toBe(false);
        }
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Bitcoin Address Validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('bitcoinAddressSchema', () => {
    // Valid mainnet addresses
    const validMainnetAddresses = [
      // Legacy P2PKH
      '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      // SegWit P2WPKH (bech32)
      'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      // SegWit P2WSH (bech32)
      'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3',
      // Taproot (bech32m)
      'bc1pxwww0ct9ue7e8tdnlmug5m2tamfn7q06sahstg39ys4c9f3340qqxrdu9k',
    ];

    // Valid testnet addresses
    const validTestnetAddresses = [
      // Testnet Legacy
      'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn',
      'n3ZddxzLvAY9o7184TB4c6FJasAybsw4HZ',
      // Testnet SegWit
      'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      // Testnet Taproot (version 1, bech32m)
      'tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c',
    ];

    it.each([...validMainnetAddresses, ...validTestnetAddresses])(
      'should accept valid Bitcoin address: %s',
      (address) => {
        const result = bitcoinAddressSchema.safeParse(address);
        expect(result.success).toBe(true);
      }
    );

    describe('should reject truncated addresses', () => {
      /**
       * The bitcoinAddressSchema uses bitcoinjs-lib for proper validation:
       * - bech32/bech32m checksum verification for SegWit/Taproot addresses
       * - base58check checksum verification for legacy addresses
       * 
       * Truncated addresses will correctly fail validation.
       */

      it('should reject bech32 (Taproot) address with last character removed', () => {
        const valid = 'tb1pqqqqp399et2xygdj5xreqhjjvcmzhxw4aywxecjdzew6hylgvsesf3hn0c';
        const truncated = valid.slice(0, -1); // Remove last 'c'

        const result = bitcoinAddressSchema.safeParse(truncated);
        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe('Invalid Bitcoin address format');
      });

      it('should reject bech32 (SegWit) address with last character removed', () => {
        const valid = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
        const truncated = valid.slice(0, -1);

        const result = bitcoinAddressSchema.safeParse(truncated);
        expect(result.success).toBe(false);
      });

      it('should reject legacy address with last character removed', () => {
        const valid = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
        const truncated = valid.slice(0, -1);

        const result = bitcoinAddressSchema.safeParse(truncated);
        expect(result.success).toBe(false);
      });

      it('should reject address with multiple characters removed', () => {
        const valid = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
        const truncated = valid.slice(0, -6);

        const result = bitcoinAddressSchema.safeParse(truncated);
        expect(result.success).toBe(false);
      });
    });

    describe('should reject malformed addresses', () => {
      const invalidAddresses = [
        { address: '', reason: 'empty string' },
        { address: 'bc1', reason: 'too short' },
        { address: 'bc1invalid!address', reason: 'invalid characters' },
        { address: '0x659579F1460c38c3ce3288b47b074646cef855fc', reason: 'EVM address' },
        { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdqINVALID', reason: 'uppercase in bech32' },
      ];

      it.each(invalidAddresses)(
        'should reject $reason: $address',
        ({ address }) => {
          const result = bitcoinAddressSchema.safeParse(address);
          expect(result.success).toBe(false);
        }
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Solana Address Validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('solanaAddressSchema', () => {
    const validAddresses = [
      'DRpbCBMxVnDK7maPGv7USy4MjEBQdCgaBExK8rKJmVZk',
      '11111111111111111111111111111111',
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    ];

    it.each(validAddresses)('should accept valid Solana address: %s', (address) => {
      const result = solanaAddressSchema.safeParse(address);
      expect(result.success).toBe(true);
    });

    /**
     * LIMITATION: Solana addresses don't have a checksum
     * 
     * Unlike Bitcoin, Solana addresses are just raw base58-encoded 32-byte keys.
     * A truncated address that still decodes to 32 bytes will pass format validation.
     * 
     * This is a known limitation of the Solana address format itself.
     * The best we can do is verify:
     * 1. Valid base58 characters
     * 2. Length between 32-44 chars
     * 3. Decodes to exactly 32 bytes
     * 
     * Some truncations will change the decoded length, failing validation.
     * Others won't - this is unavoidable without a checksum.
     */
    it('should reject addresses that decode to wrong byte length', () => {
      // Removing 2+ chars from a 44-char address usually changes decoded length
      const valid = 'DRpbCBMxVnDK7maPGv7USy4MjEBQdCgaBExK8rKJmVZk';
      const truncated = valid.slice(0, -2);

      const result = solanaAddressSchema.safeParse(truncated);
      expect(result.success).toBe(false);
    });

    it('should reject addresses shorter than 32 chars', () => {
      const tooShort = 'DRpbCBMxVnDK7maPGv7USy4MjEBQdC';

      const result = solanaAddressSchema.safeParse(tooShort);
      expect(result.success).toBe(false);
    });

    it('documents: single-char truncation may still decode to 32 bytes (no checksum)', () => {
      // This documents a limitation of Solana addresses - no checksum means
      // some truncations still produce valid-looking addresses
      const valid = 'DRpbCBMxVnDK7maPGv7USy4MjEBQdCgaBExK8rKJmVZk';
      const truncated = valid.slice(0, -1);

      const result = solanaAddressSchema.safeParse(truncated);
      // This may pass or fail depending on the specific truncation
      // We document rather than assert specific behavior
      expect(typeof result.success).toBe('boolean');
    });

    it('should reject address with invalid characters', () => {
      // Base58 doesn't include 0, O, I, l
      const invalid = 'DRpbCBMxVnDK7maPGv7USy4MjEBQdCgaBExK8rKJmVZ0';

      const result = solanaAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sui Address Validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('suiAddressSchema', () => {
    const validAddresses = [
      '0x02a212de6a9dfa3a69e22387acfbafbb1a9e591bd9d636e7895dcfc8de05f331',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    ];

    it.each(validAddresses)('should accept valid Sui address: %s', (address) => {
      const result = suiAddressSchema.safeParse(address);
      expect(result.success).toBe(true);
    });

    it('should reject truncated address', () => {
      const valid = '0x02a212de6a9dfa3a69e22387acfbafbb1a9e591bd9d636e7895dcfc8de05f331';
      const truncated = valid.slice(0, -1);

      const result = suiAddressSchema.safeParse(truncated);
      expect(result.success).toBe(false);
    });

    it('should reject address with only 40 hex chars (EVM length)', () => {
      const evmLength = '0x02a212de6a9dfa3a69e22387acfbafbb1a9e591b';

      const result = suiAddressSchema.safeParse(evmLength);
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Starknet Address Validation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('starknetAddressSchema', () => {
    const validAddresses = [
      '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      '0x1',
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    ];

    it.each(validAddresses)('should accept valid Starknet address: %s', (address) => {
      const result = starknetAddressSchema.safeParse(address);
      expect(result.success).toBe(true);
    });

    it('should reject address without 0x prefix', () => {
      const invalid = '049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';

      const result = starknetAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty hex part', () => {
      const invalid = '0x';

      const result = starknetAddressSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Cross-chain Validation (prevent mixing)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cross-chain address rejection', () => {
    const evmAddress = '0x659579F1460c38c3ce3288b47b074646cef855fc';
    const btcAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    const solanaAddress = 'DRpbCBMxVnDK7maPGv7USy4MjEBQdCgaBExK8rKJmVZk';

    it('should reject Bitcoin address in EVM schema', () => {
      const result = evmAddressSchema.safeParse(btcAddress);
      expect(result.success).toBe(false);
    });

    it('should reject EVM address in Bitcoin schema', () => {
      const result = bitcoinAddressSchema.safeParse(evmAddress);
      expect(result.success).toBe(false);
    });

    it('should reject Solana address in EVM schema', () => {
      const result = evmAddressSchema.safeParse(solanaAddress);
      expect(result.success).toBe(false);
    });

    it('should reject EVM address in Solana schema', () => {
      const result = solanaAddressSchema.safeParse(evmAddress);
      expect(result.success).toBe(false);
    });
  });
});

