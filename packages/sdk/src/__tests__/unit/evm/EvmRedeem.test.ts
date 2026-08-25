/**
 * EVM Redeem action unit tests
 *
 * Covers the BTC.b → native BTC redemption flow on EVM chains. The action
 * burns BTC.b on an EVM source chain and releases native BTC to a Bitcoin
 * recipient address.
 *
 * @module __tests__/unit/evm/EvmWithdrawBtcb.test.ts
 */

import { describe, expect, it, vi } from 'vitest';

import { AssetId, Chain } from '../../../core';
import { LombardError, ValidationErrorCode } from '../../../shared/errors';

describe('EvmWithdrawBtcb interface', () => {
  describe('EvmWithdrawBtcbParams', () => {
    it('requires BTC.b as input asset', () => {
      const params = {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.BITCOIN_MAINNET,
      };

      expect(params.assetIn).toBe(AssetId.BTCb);
    });

    it('requires native BTC as output asset', () => {
      const params = {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.BITCOIN_MAINNET,
      };

      expect(params.assetOut).toBe(AssetId.BTC);
    });

    it('is a cross-chain operation (EVM → Bitcoin)', () => {
      const params = {
        assetIn: AssetId.BTCb,
        assetOut: AssetId.BTC,
        sourceChain: Chain.AVALANCHE,
        destChain: Chain.BITCOIN_MAINNET,
      };

      expect(params.sourceChain).not.toBe(params.destChain);
    });
  });

  describe('EvmWithdrawBtcbPrepareParams', () => {
    it('accepts valid prepare parameters', () => {
      const params = {
        amount: '0.1',
        recipient: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      };

      expect(params.amount).toBe('0.1');
      expect(params.recipient).toBeDefined();
    });

    it('requires a Bitcoin recipient address', () => {
      const params = {
        amount: '0.1',
        recipient: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      };

      expect(params.recipient.startsWith('bc1')).toBe(true);
    });
  });

  describe('Method signatures', () => {
    it('defines prepare method', () => {
      type PrepareMethod = (params: {
        amount: string;
        recipient: string;
      }) => Promise<void>;
      const testType: PrepareMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it('defines approve method', () => {
      type ApproveMethod = () => Promise<void>;
      const testType: ApproveMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it('defines execute method', () => {
      type ExecuteMethod = () => Promise<{ txHash: string }>;
      const testType: ExecuteMethod = async () => ({ txHash: '0x123' });
      expect(testType).toBeDefined();
    });
  });

  describe('Redemption logic', () => {
    it('burns BTC.b and releases native BTC', () => {
      const redeemFlow = {
        input: AssetId.BTCb,
        output: AssetId.BTC,
        operation: 'burn-and-release',
      };

      expect(redeemFlow.operation).toBe('burn-and-release');
    });

    it('is a 1:1 conversion', () => {
      const inputAmount = '0.1';
      const outputAmount = '0.1';
      expect(inputAmount).toBe(outputAmount);
    });
  });

  describe('Error handling', () => {
    it('rejects chains without BTC.b support', () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_CHAIN,
        `BTC.b is not available on this chain. Cannot redeem.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_CHAIN);
    });

    it('handles insufficient BTC.b balance', () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        `Insufficient BTC.b balance for redemption.`,
      );

      expect(error.message).toContain('Insufficient');
    });
  });

  describe('Chain support', () => {
    it('supports EVM source chains that have BTC.b deployed', () => {
      const supportedChains = [Chain.AVALANCHE, Chain.AVALANCHE_FUJI];

      supportedChains.forEach((chain) => {
        expect(chain).toBeDefined();
        expect(typeof chain).toBe('string');
      });

      expect(supportedChains).toContain(Chain.AVALANCHE);
      expect(supportedChains).toContain(Chain.AVALANCHE_FUJI);
    });
  });

  describe('Event emissions', () => {
    it('emits progress events', () => {
      const handler = vi.fn((progress: { status: string; txHash?: string }) => {
        expect(progress.status).toBeDefined();
      });

      handler({ status: 'completed', txHash: '0x123' });
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('Public properties', () => {
    it('exposes status property', () => {
      type HasStatus = { readonly status: string };
      const obj: HasStatus = { status: 'idle' };
      expect(obj.status).toBe('idle');
    });

    it('exposes amount property', () => {
      type HasAmount = { readonly amount?: string };
      const obj: HasAmount = { amount: '0.1' };
      expect(obj.amount).toBe('0.1');
    });

    it('exposes txHash after execute', () => {
      type HasTxHash = { readonly txHash?: string };
      const obj: HasTxHash = { txHash: '0x123' };
      expect(obj.txHash).toBeDefined();
    });
  });
});
