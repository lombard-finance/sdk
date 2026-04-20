/**
 * SolanaUnstake Unit Tests
 *
 * Tests for the Solana LBTC unstaking action with mocked providers.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SolanaUnstake } from '../../../chains/solana/actions/unstake/SolanaUnstake';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import { NonEvmUnstakeStatus } from '../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../shared/context';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════════

function createMockSolanaService() {
  return {
    signLbtcDestination: vi.fn().mockResolvedValue({ signature: '0xmock' }),
    unstake: vi.fn().mockResolvedValue({ txHash: 'mock-solana-tx-hash-123' }),
    redeemForBtc: vi.fn().mockResolvedValue({ txHash: 'mock-redeem-tx-hash' }),
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
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SolanaUnstake', () => {
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

  // ─────────────────────────────────────────────────────────────────────────
  // Initialization Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize with IDLE status', () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      expect(unstake.status).toBe(NonEvmUnstakeStatus.IDLE);
    });

    it('should throw for unsupported source chain', () => {
      const invalidParams = {
        ...validParams,
        sourceChain: Chain.ETHEREUM, // Not a Solana chain
      };

      expect(() => new SolanaUnstake(mockCtx, invalidParams)).toThrow();
    });

    it('should throw for unsupported env/chain combination', () => {
      // testnet env with mainnet chain
      const testnetCtx = createMockContext({ env: Env.testnet });

      expect(
        () => new SolanaUnstake(testnetCtx, validParams),
      ).toThrow();
    });

    it('should accept valid testnet configuration', () => {
      const testnetCtx = createMockContext({ env: Env.testnet });
      const testnetParams = {
        ...validParams,
        sourceChain: Chain.SOLANA_DEVNET,
        destChain: Chain.BITCOIN_SIGNET,
      };

      const unstake = new SolanaUnstake(testnetCtx, testnetParams);
      expect(unstake.status).toBe(NonEvmUnstakeStatus.IDLE);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Prepare Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('prepare', () => {
    it('should transition to READY status on valid prepare', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);

      await unstake.prepare(validPrepareParams);

      expect(unstake.status).toBe(NonEvmUnstakeStatus.READY);
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

  // ─────────────────────────────────────────────────────────────────────────
  // Execute Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('should call solana service unstake method', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      const result = await unstake.execute();

      expect(mockCtx.solana.unstake).toHaveBeenCalledWith({
        amount: expect.any(String), // Converted to satoshis
        btcAddress: validPrepareParams.recipient,
        network: 'mainnet-beta',
      });
      expect(result.txHash).toBe('mock-solana-tx-hash-123');
    });

    it('should transition to COMPLETED status', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(unstake.status).toBe(NonEvmUnstakeStatus.COMPLETED);
    });

    it('should throw if called when not READY', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);

      await expect(unstake.execute()).rejects.toThrow(/execute/);
    });

    it('should handle service errors', async () => {
      mockCtx.solana.unstake = vi
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

      expect(unstake.txHash).toBe('mock-solana-tx-hash-123');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Event Tests
  // ─────────────────────────────────────────────────────────────────────────

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
      mockCtx.solana.unstake = vi
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

  // ─────────────────────────────────────────────────────────────────────────
  // Loading State Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('should set isLoading during prepare', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      const loadingStates: boolean[] = [];

      unstake.on('loading', (isLoading) => loadingStates.push(isLoading));
      await unstake.prepare(validPrepareParams);

      expect(loadingStates).toContain(true);
      expect(unstake.isLoading).toBe(false); // Should be false after completion
    });

    it('should set isLoading during execute', async () => {
      const unstake = new SolanaUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      const loadingStates: boolean[] = [];
      unstake.on('loading', (isLoading) => loadingStates.push(isLoading));

      await unstake.execute();

      expect(loadingStates).toContain(true);
      expect(unstake.isLoading).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Network Mapping Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('network mapping', () => {
    it('should use mainnet-beta for prod env', async () => {
      const prodCtx = createMockContext({ env: Env.prod });
      const unstake = new SolanaUnstake(prodCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(prodCtx.solana.unstake).toHaveBeenCalledWith(
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

      expect(stageCtx.solana.unstake).toHaveBeenCalledWith(
        expect.objectContaining({ network: 'devnet' }),
      );
    });
  });
});

