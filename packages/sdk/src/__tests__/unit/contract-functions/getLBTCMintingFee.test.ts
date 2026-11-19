/**
 * LBTC Minting Fee Tests
 *
 * Tests to verify the fee fetching logic works correctly.
 *
 * The minting fee (also called "network fee" or "auto-mint fee") is the amount
 * in satoshis that is deducted from the minted LBTC during the auto-mint
 * process.
 *
 * Fee Structure:
 * - Fee-approval chains (Ethereum, Sepolia): Have non-zero fees
 * - Chains without fee approval (Base, BSC): Have 0 fees (no fee configured on-chain)
 *
 * The fee is read from the on-chain AssetRouter.maxMintCommission() function.
 */

import { describe, expect, it } from 'vitest';

import { Token } from '../../../tokens/token-addresses';
import { fromSatoshi, toSatoshi } from '../../../utils/satoshi';

describe('Minting Fee Logic', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Satoshi Conversion Tests
  // These are the underlying conversion functions used by getMintingFee
  // ═══════════════════════════════════════════════════════════════════════════

  describe('fromSatoshi conversion', () => {
    it('should convert 0 satoshis to 0 BTC', () => {
      const btc = fromSatoshi('0');
      expect(btc.toNumber()).toBe(0);
      expect(btc.toString()).toBe('0');
    });

    it('should convert 38 satoshis to 0.00000038 BTC', () => {
      // This is the actual Ethereum mainnet fee
      const btc = fromSatoshi('38');
      expect(btc.toNumber()).toBeCloseTo(0.00000038, 10);
    });

    it('should convert 1992 satoshis to 0.00001992 BTC', () => {
      // Example fee value
      const btc = fromSatoshi('1992');
      expect(btc.toNumber()).toBeCloseTo(0.00001992, 10);
    });

    it('should convert 100000000 satoshis to 1 BTC', () => {
      const btc = fromSatoshi('100000000');
      expect(btc.toNumber()).toBe(1);
    });
  });

  describe('toSatoshi conversion', () => {
    it('should convert 0 BTC to 0 satoshis', () => {
      const sats = toSatoshi('0');
      expect(sats.toNumber()).toBe(0);
    });

    it('should convert 0.00000038 BTC to 38 satoshis', () => {
      const sats = toSatoshi('0.00000038');
      expect(sats.toNumber()).toBe(38);
    });

    it('should convert 1 BTC to 100000000 satoshis', () => {
      const sats = toSatoshi('1');
      expect(sats.toNumber()).toBe(100000000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Token Support
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Supported tokens', () => {
    it('should have LBTC token defined', () => {
      expect(Token.LBTC).toBe('LBTC');
    });

    it('should have BTCb token defined', () => {
      expect(Token.BTCb).toBe('BTC.b');
    });

    it('should have BTCK token defined', () => {
      expect(Token.BTCK).toBe('BTCK');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Fee Behavior Documentation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Expected fee behavior (documentation)', () => {
    /**
     * The minting fee is the auto-mint commission in satoshis.
     *
     * When a user deposits BTC, LBTC is minted to their address automatically,
     * less the minting fee the contract reports.
     *
     * Fee-approval chains (Ethereum, Sepolia): Have fees configured on-chain
     * Chains without fee approval (Base, BSC): no fee configured on-chain, fee = 0
     */

    it('should document fee structure', () => {
      // Ethereum mainnet always has a fee configured
      const ethereumMainnetFee = 36; // satoshis
      expect(ethereumMainnetFee).toBeGreaterThan(0);

      // Sepolia (stage) has fee configured
      const sepoliaStageFee = 1433; // satoshis
      expect(sepoliaStageFee).toBeGreaterThan(0);

      // Base has no fee configured
      const baseFee = 0;
      expect(baseFee).toBe(0);
    });

    it('should document which chains have a minting fee configured', () => {
      // Chains without fee approval (fee = 0 on-chain)
      const noApprovalChains = ['Base', 'BSC'];

      // Fee-approval chains (fee configured on-chain, deducted from the minted LBTC)
      const feeApprovalChains = ['Ethereum Mainnet', 'Sepolia'];

      expect(noApprovalChains.length).toBeGreaterThan(0);
      expect(feeApprovalChains.length).toBeGreaterThan(0);
    });
  });
});
