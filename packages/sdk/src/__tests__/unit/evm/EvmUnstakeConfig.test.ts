/**
 * EVM Unstake Config Unit Tests
 *
 * Tests address validation based on assetOut to prevent
 * bugs like #9 (EVM address validation errors when Bitcoin address expected).
 *
 * @module __tests__/unit/evm/EvmWithdrawLbtcConfig.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import {
  evmToBtcbConfig,
  evmToBtcConfig,
} from '../../../chains/evm/actions/withdraw-lbtc/config/evm';
import { Chain } from '../../../core';
import {
  bitcoinAddressSchema,
  evmAddressSchema,
} from '../../../shared/validation';

describe('EVM Unstake Config', () => {
  describe('Address Schema Selection', () => {
    it('should use Bitcoin address schema when unstaking to BTC', () => {
      // Bug #9: When assetOut is BTC, recipient should be a Bitcoin address
      expect(evmToBtcConfig.recipientSchema).toBe(bitcoinAddressSchema);
    });

    it('should use EVM address schema when unstaking to BTC.b', () => {
      // When assetOut is BTCb, recipient should be an EVM address
      expect(evmToBtcbConfig.recipientSchema).toBe(evmAddressSchema);
    });
  });

  describe('Bitcoin Address Validation (assetOut = BTC)', () => {
    const schema = evmToBtcConfig.recipientSchema;

    describe('Valid Bitcoin addresses', () => {
      it('should accept valid mainnet P2PKH address', () => {
        expect(() =>
          schema.parse('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'),
        ).not.toThrow();
      });

      it('should accept valid mainnet P2SH address', () => {
        expect(() =>
          schema.parse('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'),
        ).not.toThrow();
      });

      it('should accept valid mainnet Bech32 address', () => {
        expect(() =>
          schema.parse('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'),
        ).not.toThrow();
      });

      it('should accept valid testnet/signet P2PKH address', () => {
        expect(() =>
          schema.parse('mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn'),
        ).not.toThrow();
      });

      it('should accept valid testnet/signet Bech32 address', () => {
        // Valid testnet bech32 address from BIP-0173
        expect(() =>
          schema.parse('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'),
        ).not.toThrow();
      });

      it('should accept valid Taproot (bc1p) address', () => {
        expect(() =>
          schema.parse(
            'bc1pw0sr89hvfgwyhj98gamyewndt5yczw5cdkl7j3eystx2js48gfks2w72ct',
          ),
        ).not.toThrow();
      });
    });

    describe('Invalid Bitcoin addresses', () => {
      it('should reject EVM address (Bug #9 scenario)', () => {
        // This is the exact bug scenario - user entered EVM address
        // when Bitcoin address was expected
        expect(() =>
          schema.parse('0x5991d9dDB5f20774A1e4D0Bf7bb30F1DdBa870fD'),
        ).toThrow();
      });

      it('should reject empty string', () => {
        expect(() => schema.parse('')).toThrow();
      });

      it('should reject invalid format', () => {
        expect(() => schema.parse('invalid-address')).toThrow();
      });

      // Note: Basic regex validation doesn't validate checksum
      // Full checksum validation would require a Bitcoin library
    });
  });

  describe('EVM Address Validation (assetOut = BTCb)', () => {
    const schema = evmToBtcbConfig.recipientSchema;

    describe('Valid EVM addresses', () => {
      it('should accept valid checksummed EVM address', () => {
        expect(() =>
          schema.parse('0x5991d9dDB5f20774A1e4D0Bf7bb30F1DdBa870fD'),
        ).not.toThrow();
      });

      it('should accept valid lowercase EVM address', () => {
        expect(() =>
          schema.parse('0x5991d9ddb5f20774a1e4d0bf7bb30f1ddba870fd'),
        ).not.toThrow();
      });

      it('should accept zero address', () => {
        expect(() =>
          schema.parse('0x0000000000000000000000000000000000000000'),
        ).not.toThrow();
      });
    });

    describe('Invalid EVM addresses', () => {
      it('should reject Bitcoin address (reverse Bug #9)', () => {
        // User entered Bitcoin address when EVM address expected
        expect(() =>
          schema.parse('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'),
        ).toThrow();
      });

      it('should reject address without 0x prefix', () => {
        expect(() =>
          schema.parse('5991d9dDB5f20774A1e4D0Bf7bb30F1DdBa870fD'),
        ).toThrow();
      });

      it('should reject address with wrong length', () => {
        expect(() => schema.parse('0x5991d9dDB5f20774A1e4D0Bf')).toThrow();
      });

      it('should reject empty string', () => {
        expect(() => schema.parse('')).toThrow();
      });

      it('should reject non-hex characters', () => {
        expect(() =>
          schema.parse('0xZZZZd9dDB5f20774A1e4D0Bf7bb30F1DdBa870fD'),
        ).toThrow();
      });
    });
  });

  describe('Route Configuration', () => {
    describe('EVM to BTC routes', () => {
      it('should have Sepolia as source chain for testnet', () => {
        const testnetRoutes = evmToBtcConfig.routes.filter((r) =>
          r.envs.some((e) => e === Env.testnet),
        );
        const sourceChains = testnetRoutes.flatMap((r) => r.sourceChains);
        // Chain identifiers use CAIP-2 format
        expect(sourceChains).toContain(Chain.SEPOLIA);
      });

      it('should have Ethereum as source chain for production', () => {
        const prodRoutes = evmToBtcConfig.routes.filter((r) =>
          r.envs.includes(Env.prod),
        );
        const sourceChains = prodRoutes.flatMap((r) => r.sourceChains);
        expect(sourceChains).toContain(Chain.ETHEREUM);
      });

      it('should have Bitcoin as destination for cross-chain unstake', () => {
        // All routes should have Bitcoin as destination
        evmToBtcConfig.routes.forEach((route) => {
          expect([Chain.BITCOIN_MAINNET, Chain.BITCOIN_SIGNET]).toContain(
            route.destChain,
          );
        });
      });
    });

    describe('EVM to BTCb routes', () => {
      it('should have matching destination for same-chain operations', () => {
        // BTC.b unstake is same-chain (e.g., Avalanche → Avalanche)
        expect(evmToBtcbConfig.routes.length).toBeGreaterThan(0);

        // Each route should have source and dest as the same chain
        evmToBtcbConfig.routes.forEach((route) => {
          route.sourceChains.forEach((source) => {
            expect(source).toBe(route.destChain);
          });
        });
      });
    });
  });

  describe('Bug #9: Address type mismatch scenarios', () => {
    it('should differentiate between BTC and EVM address requirements', () => {
      // When assetOut is BTC -> Bitcoin address required
      const btcSchema = evmToBtcConfig.recipientSchema;

      // When assetOut is BTCb -> EVM address required
      const btcbSchema = evmToBtcbConfig.recipientSchema;

      const evmAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
      const btcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

      // EVM address should be valid for BTCb, invalid for BTC
      expect(() => btcbSchema.parse(evmAddress)).not.toThrow();
      expect(() => btcSchema.parse(evmAddress)).toThrow();

      // Bitcoin address should be valid for BTC, invalid for BTCb
      expect(() => btcSchema.parse(btcAddress)).not.toThrow();
      expect(() => btcbSchema.parse(btcAddress)).toThrow();
    });
  });
});
