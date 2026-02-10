/**
 * BTC Deposit Config Unit Tests
 *
 * Tests validation functions for BTC Deposit action.
 * 
 * Note: Supported chains are derived dynamically from ASSET_CATALOG.
 * These tests verify the validation logic works correctly.
 *
 * @module __tests__/unit/btc/BtcDepositConfig.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect,it } from 'vitest';

import {
  depositConfig,
  isAssetOutSupported,
  isDestChainSupported,
  isRouteAvailable,
} from '../../../chains/btc/actions/deposit/config';
import { AssetId, Chain } from '../../../core';

describe('BTC Deposit Config', () => {
  describe('isAssetOutSupported', () => {
    it('should support BTCb for BTC Deposit', () => {
      expect(isAssetOutSupported(AssetId.BTCb)).toBe(true);
    });

    it('should NOT support LBTC for BTC Deposit (use BtcStake instead)', () => {
      // LBTC is produced by BtcStake, not BtcDeposit
      expect(isAssetOutSupported(AssetId.LBTC)).toBe(false);
    });

    it('should NOT support BTC as output (it is the input asset)', () => {
      expect(isAssetOutSupported(AssetId.BTC)).toBe(false);
    });

    it('should have BTCb as the only supported output asset', () => {
      expect(depositConfig.supportedAssetsOut).toEqual([AssetId.BTCb]);
    });
  });

  describe('isDestChainSupported', () => {
    it('should support Avalanche for BTC.b deposit', () => {
      expect(isDestChainSupported(Chain.AVALANCHE)).toBe(true);
    });

    it('should support Avalanche Fuji (testnet) for BTC.b deposit', () => {
      expect(isDestChainSupported(Chain.AVALANCHE_FUJI)).toBe(true);
    });

    it('should have at least one supported destination chain', () => {
      expect(depositConfig.destChains.length).toBeGreaterThan(0);
    });

    it('should derive chains from asset catalog', () => {
      // Verify that destChains array exists and is derived from BTCb deployments
      expect(Array.isArray(depositConfig.destChains)).toBe(true);
      // All chains should be EVM chains (strings)
      depositConfig.destChains.forEach(chain => {
        expect(typeof chain).toBe('string');
      });
    });
  });

  describe('isRouteAvailable', () => {
    it('should allow Bitcoin Mainnet source in production', () => {
      expect(isRouteAvailable(Chain.BITCOIN_MAINNET, Env.prod)).toBe(true);
    });

    it('should allow Bitcoin Signet source in testnet', () => {
      expect(isRouteAvailable(Chain.BITCOIN_SIGNET, Env.testnet)).toBe(true);
    });

    it('should allow Bitcoin Signet source in stage', () => {
      expect(isRouteAvailable(Chain.BITCOIN_SIGNET, Env.stage)).toBe(true);
    });

    it('should NOT allow Bitcoin Signet in production', () => {
      expect(isRouteAvailable(Chain.BITCOIN_SIGNET, Env.prod)).toBe(false);
    });

    it('should NOT allow Bitcoin Mainnet in testnet', () => {
      expect(isRouteAvailable(Chain.BITCOIN_MAINNET, Env.testnet)).toBe(false);
    });

    it('should allow undefined source chain (uses env default)', () => {
      expect(isRouteAvailable(undefined, Env.testnet)).toBe(true);
      expect(isRouteAvailable(undefined, Env.prod)).toBe(true);
    });
  });

  describe('Validation logic', () => {
    it('should have consistent asset validation', () => {
      // Only BTCb should be valid
      const validAssets = [AssetId.BTCb];
      const invalidAssets = [AssetId.LBTC, AssetId.BTC];

      validAssets.forEach(asset => {
        expect(isAssetOutSupported(asset)).toBe(true);
      });

      invalidAssets.forEach(asset => {
        expect(isAssetOutSupported(asset)).toBe(false);
      });
    });

    it('should validate that Avalanche chains support BTC.b deposit', () => {
      // Primary chains for BTC.b
      expect(isDestChainSupported(Chain.AVALANCHE)).toBe(true);
      expect(isDestChainSupported(Chain.AVALANCHE_FUJI)).toBe(true);
    });

    it('should enforce environment-specific routes', () => {
      // Production: Bitcoin Mainnet only
      expect(isRouteAvailable(Chain.BITCOIN_MAINNET, Env.prod)).toBe(true);
      expect(isRouteAvailable(Chain.BITCOIN_SIGNET, Env.prod)).toBe(false);

      // Testnet/Stage/Dev: Bitcoin Signet only
      expect(isRouteAvailable(Chain.BITCOIN_SIGNET, Env.testnet)).toBe(true);
      expect(isRouteAvailable(Chain.BITCOIN_SIGNET, Env.stage)).toBe(true);
      expect(isRouteAvailable(Chain.BITCOIN_SIGNET, Env.dev)).toBe(true);
      expect(isRouteAvailable(Chain.BITCOIN_MAINNET, Env.testnet)).toBe(false);
    });
  });

  describe('Fee authorization requirements', () => {
    it('should require fee authorization for Ethereum mainnet', () => {
      const feeAuth = depositConfig.getFeeAuthConfig(Chain.ETHEREUM);
      expect(feeAuth).not.toBeNull();
    });

    it('should NOT require fee authorization for Avalanche', () => {
      const feeAuth = depositConfig.getFeeAuthConfig(Chain.AVALANCHE);
      expect(feeAuth).toBeNull();
    });

    it('should NOT require fee authorization for Avalanche Fuji', () => {
      const feeAuth = depositConfig.getFeeAuthConfig(Chain.AVALANCHE_FUJI);
      expect(feeAuth).toBeNull();
    });
  });
});

