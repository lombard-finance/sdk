/**
 * SolanaUnstake Unit Tests
 *
 * Tests for the Solana unstake action:
 * - LBTC → BTC  (cross-chain, via LBTC program)
 * - LBTC → BTC.b (same-chain, via Asset Router redeem)
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SolanaUnstake } from '../../../chains/solana/actions/unstake/SolanaUnstake';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import { NonEvmOperationStatus } from '../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../shared/context';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════════

function createMockSolanaService() {
  return {
    signLbtcDestination: vi.fn().mockResolvedValue({ signature: '0xmock' }),
    redeemForBtc: vi
      .fn()
      .mockResolvedValue({ signature: 'mock-redeemForBtc-tx-hash' }),
    redeem: vi.fn().mockResolvedValue({ signature: 'mock-redeem-tx-hash' }),
    deposit: vi.fn().mockResolvedValue({ signature: 'mock-deposit-tx-hash' }),
  };
}

function createMockContext(
  overrides: Partial<SolanaCoreContext> = {},
): SolanaCoreContext {
  return {
    env: Env.testnet,
    partner: new PartnerConfiguration({ partnerId: 'test-partner' }),
    getProvider: vi.fn().mockResolvedValue({}),
    solana: createMockSolanaService(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests — LBTC → BTC (cross-chain)
// ═══════════════════════════════════════════════════════════════════════════

describe('SolanaUnstake — LBTC → BTC', () => {
  let mockCtx: SolanaCoreContext;

  const validParams = {
    assetIn: AssetId.LBTC,
    assetOut: AssetId.BTC,
    sourceChain: Chain.SOLANA_MAINNET,
    destChain: Chain.BITCOIN_MAINNET,
  };

  const validPrepareParams = {
    amount: '0.001',
    recipient: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  };

  beforeEach(() => {
    mockCtx = createMockContext({ env: Env.prod });
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with IDLE status', () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      expect(unstake.status).toBe(NonEvmOperationStatus.IDLE);
    });

    it('should throw for unsupported source chain', () => {
      const invalidParams = {
        ...validParams,
        sourceChain: Chain.ETHEREUM,
      };

      expect(() => new SolanaUnstake(mockCtx, invalidParams)).toThrow();
    });

    it('should throw for unsupported env/chain combination', () => {
      const testnetCtx = createMockContext({ env: Env.testnet });

      expect(() => new SolanaUnstake(testnetCtx, validParams)).toThrow();
    });

    it('should accept valid testnet configuration', () => {
      const testnetCtx = createMockContext({ env: Env.testnet });
      const testnetParams = {
        ...validParams,
        sourceChain: Chain.SOLANA_DEVNET,
        destChain: Chain.BITCOIN_SIGNET,
      };

      const unstake = new SolanaUnstake(testnetCtx, testnetParams);
      expect(unstake.status).toBe(NonEvmOperationStatus.IDLE);
    });
  });

  describe('prepare', () => {
    it('should transition to READY status on valid prepare', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);

      await unstake.prepare(validPrepareParams);

      expect(unstake.status).toBe(NonEvmOperationStatus.READY);
      expect(unstake.amount).toBe('0.001');
      expect(unstake.recipient).toBe(validPrepareParams.recipient);
    });

    it('should validate BTC address format', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);

      await expect(
        unstake.prepare({
          amount: '0.001',
          recipient: 'invalid-btc-address',
        }),
      ).rejects.toThrow();
    });

    it('should validate amount is positive', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);

      await expect(
        unstake.prepare({
          amount: '0',
          recipient: validPrepareParams.recipient,
        }),
      ).rejects.toThrow();
    });

    it('should throw if called when not IDLE', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await expect(unstake.prepare(validPrepareParams)).rejects.toThrow(
        /prepare/,
      );
    });
  });

  describe('execute', () => {
    it('should call solana service redeemForBtc with LBTC tokenMint', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      const result = await unstake.execute();

      expect(mockCtx.solana.redeemForBtc).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.any(String),
          btcAddress: validPrepareParams.recipient,
          network: 'mainnet-beta',
          env: Env.prod,
          tokenMint: expect.any(String),
        }),
      );
      expect(result.txHash).toBe('mock-redeemForBtc-tx-hash');
    });

    it('should NOT call solana service redeem', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(mockCtx.solana.redeem).not.toHaveBeenCalled();
    });

    it('should transition to COMPLETED status', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(unstake.status).toBe(NonEvmOperationStatus.COMPLETED);
    });

    it('should throw if called when not READY', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);

      await expect(unstake.execute()).rejects.toThrow(/execute/);
    });

    it('should handle service errors', async () => {
      mockCtx.solana.redeemForBtc = vi
        .fn()
        .mockRejectedValue(new Error('Transaction failed'));

      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await expect(unstake.execute()).rejects.toThrow('Transaction failed');
      expect(unstake.isFailed).toBe(true);
    });

    it('should set txHash property on success', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(unstake.txHash).toBe('mock-redeemForBtc-tx-hash');
    });
  });

  describe('events', () => {
    it('should emit progress events during prepare', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      const progressHandler = vi.fn();

      unstake.on('progress', progressHandler);
      await unstake.prepare(validPrepareParams);

      expect(progressHandler).toHaveBeenCalled();
    });

    it('should emit completed event after execute', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      const completedHandler = vi.fn();

      unstake.on('completed', completedHandler);
      await unstake.prepare(validPrepareParams);
      await unstake.execute();

      expect(completedHandler).toHaveBeenCalled();
    });

    it('should emit error event on failure', async () => {
      mockCtx.solana.redeemForBtc = vi
        .fn()
        .mockRejectedValue(new Error('Service error'));

      const unstake = new SolanaUnstake(mockCtx, validParams);
      const errorHandler = vi.fn();

      unstake.on('error', errorHandler);
      await unstake.prepare(validPrepareParams);

      await expect(unstake.execute()).rejects.toThrow();
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('network mapping', () => {
    it('should use mainnet-beta for prod env', async () => {
      const prodCtx = createMockContext({ env: Env.prod });
      const unstake = new SolanaUnstake(prodCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(prodCtx.solana.redeemForBtc).toHaveBeenCalledWith(
        expect.objectContaining({ network: 'mainnet-beta' }),
      );
    });

    it('should use devnet for stage env', async () => {
      const stageCtx = createMockContext({ env: Env.stage });
      const stageParams = {
        ...validParams,
        sourceChain: Chain.SOLANA_DEVNET,
        destChain: Chain.BITCOIN_SIGNET,
      };
      const unstake = new SolanaUnstake(stageCtx, stageParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(stageCtx.solana.redeemForBtc).toHaveBeenCalledWith(
        expect.objectContaining({ network: 'devnet' }),
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Tests — LBTC → BTC.b (same-chain)
// ═══════════════════════════════════════════════════════════════════════════

describe('SolanaUnstake — LBTC → BTC.b', () => {
  let mockCtx: SolanaCoreContext;

  const validParams = {
    assetIn: AssetId.LBTC,
    assetOut: AssetId.BTCb,
    sourceChain: Chain.SOLANA_DEVNET,
    destChain: Chain.SOLANA_DEVNET,
  };

  const validPrepareParams = {
    amount: '0.001',
    recipient: '8yarEiDaJVik7n6wX8JCbubTbtZD3WZ67Q1ytMDA2BKA',
  };

  beforeEach(() => {
    mockCtx = createMockContext({ env: Env.dev });
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with IDLE status in dev env', () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      expect(unstake.status).toBe(NonEvmOperationStatus.IDLE);
    });

    it('should initialize with IDLE status in stage env', () => {
      const stageCtx = createMockContext({ env: Env.stage });
      const unstake = new SolanaUnstake(stageCtx, validParams);
      expect(unstake.status).toBe(NonEvmOperationStatus.IDLE);
    });

    it('should initialize with IDLE status in prod env on mainnet', () => {
      const prodCtx = createMockContext({ env: Env.prod });
      const prodParams = {
        ...validParams,
        sourceChain: Chain.SOLANA_MAINNET,
        destChain: Chain.SOLANA_MAINNET,
      };
      const unstake = new SolanaUnstake(prodCtx, prodParams);
      expect(unstake.status).toBe(NonEvmOperationStatus.IDLE);
    });

    it('should throw for unsupported source chain', () => {
      const invalidParams = {
        ...validParams,
        sourceChain: Chain.ETHEREUM,
      };
      expect(() => new SolanaUnstake(mockCtx, invalidParams)).toThrow();
    });
  });

  describe('prepare', () => {
    it('should validate Solana address for BTC.b output', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);

      await unstake.prepare(validPrepareParams);

      expect(unstake.status).toBe(NonEvmOperationStatus.READY);
      expect(unstake.recipient).toBe(validPrepareParams.recipient);
    });

    it('should reject BTC address for BTC.b output', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);

      await expect(
        unstake.prepare({
          amount: '0.001',
          recipient: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        }),
      ).rejects.toThrow();
    });
  });

  describe('execute', () => {
    it('should call solana service redeem method', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      const result = await unstake.execute();

      expect(mockCtx.solana.redeem).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.any(String),
          recipient: validPrepareParams.recipient,
          network: 'devnet',
          env: Env.dev,
        }),
      );
      expect(result.txHash).toBe('mock-redeem-tx-hash');
    });

    it('should transition to COMPLETED status', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(unstake.status).toBe(NonEvmOperationStatus.COMPLETED);
    });

    it('should handle service errors', async () => {
      mockCtx.solana.redeem = vi
        .fn()
        .mockRejectedValue(new Error('Redeem failed'));

      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await expect(unstake.execute()).rejects.toThrow('Redeem failed');
      expect(unstake.isFailed).toBe(true);
    });
  });

  describe('network mapping', () => {
    it('should use devnet for dev env', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);
      await unstake.execute();

      expect(mockCtx.solana.redeem).toHaveBeenCalledWith(
        expect.objectContaining({ network: 'devnet' }),
      );
    });
  });
});
