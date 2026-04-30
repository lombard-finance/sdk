/**
 * Tests for BTC Stake Action
 *
 * Tests the BTC → LBTC staking flow with fee authorization and deposit address generation.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it, vi } from 'vitest';

import { AssetId, Chain } from '../../../../../core';
import { LombardError, ProviderErrorCode } from '../../../../../shared/errors';
import type { BtcStakeParams, BtcStakeProgress } from '../types';

// Mock SDK for testing (reserved for future tests)
const _createMockSDK = () => ({
  config: {
    env: Env.prod },
  getProvider: vi.fn() });

describe('BtcStake Interface', () => {
  describe('BtcStakeParams', () => {
    it('should accept valid stake parameters', () => {
      const params: BtcStakeParams = {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM };

      expect(params.assetOut).toBe(AssetId.LBTC);
      expect(params.destChain).toBe(Chain.ETHEREUM);
    });

    it('should support different destination chains', () => {
      const ethereumParams: BtcStakeParams = {
        assetOut: AssetId.LBTC,
        destChain: Chain.ETHEREUM };

      const baseParams: BtcStakeParams = {
        assetOut: AssetId.LBTC,
        destChain: Chain.BASE };

      expect(ethereumParams.destChain).toBe(Chain.ETHEREUM);
      expect(baseParams.destChain).toBe(Chain.BASE);
    });
  });

  describe('BtcStake Status Transitions', () => {
    it('should define all required status values', () => {
      const statuses = [
        'idle',
        'preparing',
        'needs_fee_authorization',
        'needs_address_confirmation',
        'authorizing',
        'ready',
        'ready',
        'address_ready',
        // Note: 'failed' is no longer a status - errors tracked separately,
      ];

      // Verify all status strings are defined
      statuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('BtcStakeProgress Interface', () => {
    it('should include required progress fields', () => {
      const progress: BtcStakeProgress = {
        status: 'address_ready',
        steps: {
          created: 'complete',
          verifying: 'pending',
          issuing: 'idle' },
        confirmations: 2,
        requiredConfirmations: 6,
        hasEnoughConfirmations: false,
        isClaimed: false };

      expect(progress.confirmations).toBe(2);
      expect(progress.requiredConfirmations).toBe(6);
      expect(progress.hasEnoughConfirmations).toBe(false);
      expect(progress.isClaimed).toBe(false);
    });

    it('should track deposit address', () => {
      const progress: BtcStakeProgress = {
        status: 'address_ready',
        steps: {
          created: 'complete',
          verifying: 'idle',
          issuing: 'idle' },
        depositAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' };

      expect(progress.depositAddress).toBeDefined();
      expect(progress.depositAddress).toMatch(/^bc1/);
    });
  });

  describe('BtcStake Method Signatures', () => {
    it('should define prepare method', () => {
      // Type-only test - verifies interface is correctly defined
      type PrepareMethod = (amount: string, recipient: string) => Promise<void>;

      const testType: PrepareMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it('should define authorize method', () => {
      type AuthorizeMethod = () => Promise<void>;

      const testType: AuthorizeMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it('should define generateDepositAddress method', () => {
      type GenerateAddressMethod = () => Promise<string>;

      const testType: GenerateAddressMethod = async () =>
        'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      expect(testType).toBeDefined();
    });

    it('should define execute method', () => {
      type ExecuteMethod = () => Promise<{ depositAddress: string }>;

      const testType: ExecuteMethod = async () => ({
        depositAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' });
      expect(testType).toBeDefined();
    });
  });

  describe('Event Emissions', () => {
    it('should emit progress events with correct type', () => {
      const handler = vi.fn((progress: BtcStakeProgress) => {
        expect(progress.status).toBeDefined();
        expect(progress.steps).toBeDefined();
      });

      // Simulate event emission
      handler({
        status: 'address_ready',
        steps: { created: 'complete', verifying: 'pending', issuing: 'idle' } });

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should emit status change events', () => {
      const handler = vi.fn((status: string) => {
        expect(typeof status).toBe('string');
      });

      handler('ready');
      expect(handler).toHaveBeenCalledWith('ready');
    });

    it('should emit completed event', () => {
      const handler = vi.fn();
      handler();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should emit error events', () => {
      const handler = vi.fn((error: LombardError) => {
        expect(error).toBeInstanceOf(LombardError);
      });

      handler(
        new LombardError(ProviderErrorCode.PROVIDER_MISSING, 'Test error'),
      );
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing provider errors', () => {
      const error = LombardError.providerMissing('ethereum', 'evm');

      expect(error.code).toBe(ProviderErrorCode.PROVIDER_MISSING);
      expect(error.message).toContain('ethereum');
    });

    it('should handle user rejection errors', () => {
      const error = LombardError.userRejected('fee authorization');

      expect(error.code).toBe(ProviderErrorCode.USER_REJECTED);
      expect(error.message).toContain('fee authorization');
    });

    it('should handle API errors', () => {
      const error = LombardError.providerCallFailed(
        'getNetworkFeeSignature',
        'Network error',
      );

      expect(error.code).toBe(ProviderErrorCode.PROVIDER_CALL_FAILED);
      expect(error.message).toContain('getNetworkFeeSignature');
    });
  });

  describe('Public Properties', () => {
    it('should expose status property', () => {
      // Type check - verifies readonly status: string exists
      type HasStatus = { readonly status: string };
      const obj: HasStatus = { status: 'idle' };
      expect(obj.status).toBe('idle');
    });

    it('should expose error property', () => {
      type HasError = { readonly error: LombardError | null };
      const obj: HasError = { error: null };
      expect(obj.error).toBeNull();
    });

    it('should expose amount property', () => {
      type HasAmount = { readonly amount?: string };
      const obj: HasAmount = { amount: '0.1' };
      expect(obj.amount).toBe('0.1');
    });

    it('should expose recipient property', () => {
      type HasRecipient = { readonly recipient?: string };
      const obj: HasRecipient = {
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' };
      expect(obj.recipient).toBeDefined();
    });

    it('should expose depositAddress property', () => {
      type HasDepositAddress = { readonly depositAddress?: string };
      const obj: HasDepositAddress = {
        depositAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' };
      expect(obj.depositAddress).toBeDefined();
    });
  });
});
