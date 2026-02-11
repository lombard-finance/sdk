/**
 * BTC Deposit Token Parameter Tests
 *
 * Tests to verify that the correct token (BTCb vs LBTC) is used
 * when generating deposit addresses.
 *
 * Background:
 * - BTC.b deposit must generate BTCb deposit addresses, not LBTC
 * - The token parameter must be properly derived from assetOut
 *
 * @module __tests__/unit/btc/btc-deposit-token.test.ts
 */

import { describe, expect, it } from 'vitest';

import { assetIdToToken } from '../../../chains/btc/actions/shared/tokenUtils';
import { AssetId } from '../../../core';
import { Token } from '../../../tokens/token-addresses';

describe('BTC Deposit Token Resolution', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // assetIdToToken
  // ═══════════════════════════════════════════════════════════════════════════

  describe('assetIdToToken', () => {
    describe('should map AssetId to correct Token', () => {
      it('should return Token.BTCb for AssetId.BTCb', () => {
        const token = assetIdToToken(AssetId.BTCb);
        expect(token).toBe(Token.BTCb);
      });

      it('should return Token.LBTC for AssetId.LBTC', () => {
        const token = assetIdToToken(AssetId.LBTC);
        expect(token).toBe(Token.LBTC);
      });

      it('should return default token for unknown AssetId', () => {
        // Using BTC as an example of an input-only asset
        const token = assetIdToToken(AssetId.BTC);
        expect(token).toBe(Token.LBTC); // Default is LBTC
      });

      it('should use provided default for unknown AssetId', () => {
        const token = assetIdToToken(AssetId.BTC, Token.BTCb);
        expect(token).toBe(Token.BTCb);
      });
    });

    describe('BTC Deposit specific behavior', () => {
      /**
       * The BtcDeposit.getExpectedToken() method correctly calls
       * assetIdToToken(this.params.assetOut, Token.BTCb)
       * 
       * If assetOut is not properly passed (e.g., undefined or wrong value),
       * it could default to LBTC, causing the wrong deposit address to be generated.
       */

      it('should return BTCb when assetOut is BTCb (BTC Deposit)', () => {
        // This simulates what BtcDeposit.getExpectedToken() does
        const assetOut = AssetId.BTCb;
        const defaultToken = Token.BTCb;
        
        const token = assetIdToToken(assetOut, defaultToken);
        expect(token).toBe(Token.BTCb);
      });

      it('should still return BTCb as default even for non-mapped assets in deposit', () => {
        // BtcDeposit uses Token.BTCb as default
        const defaultToken = Token.BTCb;
        
        // Even if assetOut is somehow invalid, it should fall back to BTCb for deposit
        const token = assetIdToToken(AssetId.BTC, defaultToken);
        expect(token).toBe(Token.BTCb);
      });
    });

    describe('BTC Stake specific behavior', () => {
      it('should return LBTC when assetOut is LBTC (BTC Stake)', () => {
        // This simulates what BtcStake.getExpectedToken() does
        const assetOut = AssetId.LBTC;
        const defaultToken = Token.LBTC;
        
        const token = assetIdToToken(assetOut, defaultToken);
        expect(token).toBe(Token.LBTC);
      });
    });

    describe('Token/AssetId mapping', () => {
      /**
       * Token and AssetId share the same string values for common assets:
       * - Token.BTCb = 'BTC.b'
       * - AssetId.BTCb = 'BTC.b'
       * 
       * This ensures consistency between API calls and action parameters.
       */

      it('Token and AssetId values are defined correctly', () => {
        // Both use 'BTC.b' for BTCb
        expect(Token.BTCb).toBe('BTC.b');
        expect(AssetId.BTCb).toBe('BTC.b');
        
        // Both use 'LBTC' for LBTC
        expect(Token.LBTC).toBe('LBTC');
        expect(AssetId.LBTC).toBe('LBTC');
      });

      it('assetIdToToken correctly maps AssetId.BTCb to Token.BTCb', () => {
        const token = assetIdToToken(AssetId.BTCb);
        expect(token).toBe(Token.BTCb); // 'BTC.b'
      });

      it('assetIdToToken correctly maps AssetId.LBTC to Token.LBTC', () => {
        const token = assetIdToToken(AssetId.LBTC);
        expect(token).toBe(Token.LBTC); // 'LBTC'
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Integration with getDepositBtcAddress
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Token parameter flow', () => {
    /**
     * The getDepositBtcAddress function has this signature:
     * 
     *   token: tokenParam = Token.LBTC  // Default is LBTC!
     * 
     * This means if token is not explicitly passed, it defaults to LBTC.
     * 
     * The BtcDeposit and BtcStake actions must always pass the token explicitly.
     */

    it('should use BTCb token for BTC Deposit actions', () => {
      // Simulates the full flow from action to API call
      const actionAssetOut = AssetId.BTCb;
      const actionDefault = Token.BTCb;
      
      // Action calls getExpectedToken() which does this:
      const tokenForApi = assetIdToToken(actionAssetOut, actionDefault);
      
      // This token should be BTCb, not LBTC
      expect(tokenForApi).toBe(Token.BTCb);
      expect(tokenForApi).not.toBe(Token.LBTC);
    });

    it('should use LBTC token for BTC Stake actions', () => {
      const actionAssetOut = AssetId.LBTC;
      const actionDefault = Token.LBTC;
      
      const tokenForApi = assetIdToToken(actionAssetOut, actionDefault);
      
      expect(tokenForApi).toBe(Token.LBTC);
    });

    it('should never allow BTCb deposit to use LBTC token', () => {
      // If assetOut is BTCb, the token MUST be BTCb
      const actionAssetOut = AssetId.BTCb;
      const tokenForApi = assetIdToToken(actionAssetOut, Token.BTCb);
      
      // CRITICAL: This must not be LBTC
      expect(tokenForApi).not.toBe(Token.LBTC);
      expect(tokenForApi).toBe(Token.BTCb);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge Cases
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('should handle BTCK token if supported', () => {
      // BTCK is used in some test environments
      if ('BTCK' in AssetId) {
        const assetId = 'BTCK' as AssetId;
        const token = assetIdToToken(assetId);
        // Should not throw, returns default
        expect(token).toBeDefined();
      }
    });

    it('should handle undefined-like inputs gracefully', () => {
      // TypeScript prevents this, but runtime safety is important
      const token = assetIdToToken(undefined as unknown as AssetId, Token.BTCb);
      expect(token).toBe(Token.BTCb);
    });
  });
});

