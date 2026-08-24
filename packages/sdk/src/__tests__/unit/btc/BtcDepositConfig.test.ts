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
import { describe, expect, it } from 'vitest';

import {
  evmDepositConfig,
  getDepositChainConfig,
  isAssetOutSupported,
  isDestChainSupported,
  isRouteAvailable,
  solanaDepositConfig,
} from '../../../chains/btc/actions/deposit/config';
import { AssetId, Chain } from '../../../core';

describe('BTC Deposit Config', () => {
  const evmConfig = evmDepositConfig;

  describe('isAssetOutSupported', () => {
    it('should support BTCb for BTC Deposit', () => {
      expect(isAssetOutSupported(evmConfig, AssetId.BTCb)).toBe(true);
    });

    it('should NOT support LBTC on the BTC.b route', () => {
      // LBTC is produced by BtcStake, not BtcDeposit
      expect(isAssetOutSupported(evmConfig, AssetId.LBTC)).toBe(false);
    });

    it('should NOT support BTC as output (it is the input asset)', () => {
      expect(isAssetOutSupported(evmConfig, AssetId.BTC)).toBe(false);
    });

    it('should have BTCb as the only supported output asset', () => {
      expect(evmConfig.supportedAssetsOut).toEqual([AssetId.BTCb]);
    });
  });

  describe('isDestChainSupported', () => {
    it('should support Avalanche for BTC.b deposit', () => {
      expect(isDestChainSupported(evmConfig, Chain.AVALANCHE)).toBe(true);
    });

    it('should support Avalanche Fuji (testnet) for BTC.b deposit', () => {
      expect(isDestChainSupported(evmConfig, Chain.AVALANCHE_FUJI)).toBe(true);
    });

    it('should have at least one supported destination chain', () => {
      expect(evmConfig.destChains.length).toBeGreaterThan(0);
    });

    it('should derive chains from asset catalog', () => {
      expect(Array.isArray(evmConfig.destChains)).toBe(true);
      evmConfig.destChains.forEach((chain) => {
        expect(typeof chain).toBe('string');
      });
    });
  });

  describe('isRouteAvailable', () => {
    it('should allow Bitcoin Mainnet source in production', () => {
      expect(isRouteAvailable(evmConfig, Chain.BITCOIN_MAINNET, Env.prod)).toBe(
        true,
      );
    });

    it('should allow Bitcoin Signet source in testnet', () => {
      expect(
        isRouteAvailable(evmConfig, Chain.BITCOIN_SIGNET, Env.testnet),
      ).toBe(true);
    });

    it('should allow Bitcoin Signet source in stage', () => {
      expect(isRouteAvailable(evmConfig, Chain.BITCOIN_SIGNET, Env.stage)).toBe(
        true,
      );
    });

    it('should NOT allow Bitcoin Signet in production', () => {
      expect(isRouteAvailable(evmConfig, Chain.BITCOIN_SIGNET, Env.prod)).toBe(
        false,
      );
    });

    it('should NOT allow Bitcoin Mainnet in testnet', () => {
      expect(
        isRouteAvailable(evmConfig, Chain.BITCOIN_MAINNET, Env.testnet),
      ).toBe(false);
    });

    it('should allow undefined source chain (uses env default)', () => {
      expect(isRouteAvailable(evmConfig, undefined, Env.testnet)).toBe(true);
      expect(isRouteAvailable(evmConfig, undefined, Env.prod)).toBe(true);
    });
  });

  describe('Validation logic', () => {
    it('should have consistent asset validation', () => {
      const validAssets = [AssetId.BTCb];
      const invalidAssets = [AssetId.LBTC, AssetId.BTC];

      validAssets.forEach((asset) => {
        expect(isAssetOutSupported(evmConfig, asset)).toBe(true);
      });

      invalidAssets.forEach((asset) => {
        expect(isAssetOutSupported(evmConfig, asset)).toBe(false);
      });
    });

    it('should validate that Avalanche chains support BTC.b deposit', () => {
      expect(isDestChainSupported(evmConfig, Chain.AVALANCHE)).toBe(true);
      expect(isDestChainSupported(evmConfig, Chain.AVALANCHE_FUJI)).toBe(true);
    });

    it('should enforce environment-specific routes', () => {
      expect(isRouteAvailable(evmConfig, Chain.BITCOIN_MAINNET, Env.prod)).toBe(
        true,
      );
      expect(isRouteAvailable(evmConfig, Chain.BITCOIN_SIGNET, Env.prod)).toBe(
        false,
      );

      expect(
        isRouteAvailable(evmConfig, Chain.BITCOIN_SIGNET, Env.testnet),
      ).toBe(true);
      expect(isRouteAvailable(evmConfig, Chain.BITCOIN_SIGNET, Env.stage)).toBe(
        true,
      );
      expect(isRouteAvailable(evmConfig, Chain.BITCOIN_SIGNET, Env.dev)).toBe(
        true,
      );
      expect(
        isRouteAvailable(evmConfig, Chain.BITCOIN_MAINNET, Env.testnet),
      ).toBe(false);
    });
  });

  describe('Fee authorization requirements', () => {
    it('should require fee authorization for Ethereum mainnet', () => {
      const feeAuth = evmConfig.getFeeAuthConfig(Chain.ETHEREUM);
      expect(feeAuth).not.toBeNull();
    });

    it('should NOT require fee authorization for Avalanche', () => {
      const feeAuth = evmConfig.getFeeAuthConfig(Chain.AVALANCHE);
      expect(feeAuth).toBeNull();
    });

    it('should NOT require fee authorization for Avalanche Fuji', () => {
      const feeAuth = evmConfig.getFeeAuthConfig(Chain.AVALANCHE_FUJI);
      expect(feeAuth).toBeNull();
    });
  });

  describe('Registry', () => {
    it('should return EVM config for evm chain type', () => {
      expect(getDepositChainConfig('evm')).toBe(evmConfig);
    });

    it('should return Solana config for solana chain type', () => {
      expect(getDepositChainConfig('solana')).toBe(solanaDepositConfig);
    });

    it('should return undefined for unsupported chain types', () => {
      expect(getDepositChainConfig('bitcoin' as never)).toBeUndefined();
    });
  });

  describe('Solana deposit config', () => {
    const solConfig = solanaDepositConfig;

    it('should support BTCb as output asset', () => {
      expect(isAssetOutSupported(solConfig, AssetId.BTCb)).toBe(true);
    });

    it('should NOT support LBTC as output asset', () => {
      expect(isAssetOutSupported(solConfig, AssetId.LBTC)).toBe(false);
    });

    it('should support Solana devnet as destination', () => {
      expect(isDestChainSupported(solConfig, Chain.SOLANA_DEVNET)).toBe(true);
    });

    it('should NOT require fee authorization for Solana', () => {
      expect(solConfig.getFeeAuthConfig(Chain.SOLANA_MAINNET)).toBeNull();
    });

    it('should have at least one supported destination chain', () => {
      expect(solConfig.destChains.length).toBeGreaterThan(0);
    });

    it('should allow Bitcoin Mainnet source in production', () => {
      expect(isRouteAvailable(solConfig, Chain.BITCOIN_MAINNET, Env.prod)).toBe(
        true,
      );
    });

    it('should allow Bitcoin Signet source in dev', () => {
      expect(isRouteAvailable(solConfig, Chain.BITCOIN_SIGNET, Env.dev)).toBe(
        true,
      );
    });

    it('should allow Bitcoin Signet source in stage', () => {
      expect(isRouteAvailable(solConfig, Chain.BITCOIN_SIGNET, Env.stage)).toBe(
        true,
      );
    });

    it('should allow Bitcoin Signet source in testnet', () => {
      expect(
        isRouteAvailable(solConfig, Chain.BITCOIN_SIGNET, Env.testnet),
      ).toBe(true);
    });

    it('should NOT allow Bitcoin Signet source in ibc', () => {
      expect(isRouteAvailable(solConfig, Chain.BITCOIN_SIGNET, Env.ibc)).toBe(
        false,
      );
    });
  });
});
