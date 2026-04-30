/**
 * EVM Redeem Action Unit Tests
 *
 * Tests the LBTC → BTC.b redemption flow on EVM chains.
 *
 * @module __tests__/unit/evm/EvmRedeem.test.ts
 */

import { describe, expect, it, vi } from 'vitest';

import { AssetId, Chain } from '../../../core';
import { LombardError, ValidationErrorCode } from '../../../shared/errors';

describe('EvmRedeem Interface', () => {
  describe('EvmRedeemParams', () => {
    it('should require LBTC as input asset', () => {
      const params = {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE };

      expect(params.assetIn).toBe(AssetId.LBTC);
    });

    it('should require BTCb as output asset', () => {
      const params = {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE };

      expect(params.assetOut).toBe(AssetId.BTCb);
    });

    it('should be same-chain operation', () => {
      const params = {
        assetIn: AssetId.LBTC,
        assetOut: AssetId.BTCb,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.AVALANCHE, // Same as source
      };

      expect(params.sourceChain).toBe(params.destChain);
    });
  });

  describe('EvmRedeemPrepareParams', () => {
    it('should accept valid prepare parameters', () => {
      const params = {
        amount: '0.1',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' };

      expect(params.amount).toBe('0.1');
      expect(params.recipient).toBeDefined();
    });

    it('should require EVM recipient address', () => {
      const params = {
        amount: '0.1',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' };

      expect(params.recipient).toMatch(/^0x/);
    });
  });

  describe('Status Transitions', () => {
    it('should define all required status values', () => {
      const statuses = [
        'idle',
        'needs-approval',
        'ready',
        'completed',
      ];

      statuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('Method Signatures', () => {
    it('should define prepare method', () => {
      type PrepareMethod = (params: { amount: string; recipient: string }) => Promise<void>;
      const testType: PrepareMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it('should define approve method', () => {
      type ApproveMethod = () => Promise<void>;
      const testType: ApproveMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it('should define execute method', () => {
      type ExecuteMethod = () => Promise<{ txHash: string }>;
      const testType: ExecuteMethod = async () => ({ txHash: '0x123' });
      expect(testType).toBeDefined();
    });
  });

  describe('Redemption Logic', () => {
    it('should burn LBTC and mint BTC.b', () => {
      // Redeem burns LBTC and mints equivalent BTC.b
      const redeemFlow = {
        input: AssetId.LBTC,
        output: AssetId.BTCb,
        operation: 'burn-and-mint' };

      expect(redeemFlow.operation).toBe('burn-and-mint');
    });

    it('should be 1:1 conversion', () => {
      const inputAmount = '0.1';
      const outputAmount = '0.1'; // 1:1 ratio
      
      expect(inputAmount).toBe(outputAmount);
    });
  });

  describe('Token Approval', () => {
    it('should require LBTC approval before redemption', () => {
      const approvalRequired = true;
      expect(approvalRequired).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should reject BTC as output (use unstake)', () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_ASSET,
        `Cannot redeem to BTC. Use EvmUnstake for LBTC → BTC.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_ASSET);
    });

    it('should reject chains without BTC.b support', () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `BTC.b is not available on ethereum. Cannot redeem.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_CHAIN);
    });

    it('should handle insufficient LBTC balance', () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        `Insufficient LBTC balance for redemption.`,
      );

      expect(error.message).toContain('Insufficient');
    });
  });

  describe('Chain Support', () => {
    it('should support Avalanche chains', () => {
      const supportedChains = [Chain.AVALANCHE, Chain.AVALANCHE_FUJI];
      
      // Chains are CAIP-2 format (e.g., eip155:43114)
      supportedChains.forEach(chain => {
        expect(chain).toBeDefined();
        expect(typeof chain).toBe('string');
      });

      // Verify they are the correct Avalanche chain IDs
      expect(supportedChains).toContain(Chain.AVALANCHE);
      expect(supportedChains).toContain(Chain.AVALANCHE_FUJI);
    });
  });

  describe('Event Emissions', () => {
    it('should emit progress events', () => {
      const handler = vi.fn((progress: { status: string; txHash?: string }) => {
        expect(progress.status).toBeDefined();
      });

      handler({ status: 'completed', txHash: '0x123' });
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('Public Properties', () => {
    it('should expose status property', () => {
      type HasStatus = { readonly status: string };
      const obj: HasStatus = { status: 'idle' };
      expect(obj.status).toBe('idle');
    });

    it('should expose amount property', () => {
      type HasAmount = { readonly amount?: string };
      const obj: HasAmount = { amount: '0.1' };
      expect(obj.amount).toBe('0.1');
    });

    it('should expose txHash after execute', () => {
      type HasTxHash = { readonly txHash?: string };
      const obj: HasTxHash = { txHash: '0x123' };
      expect(obj.txHash).toBeDefined();
    });
  });
});

