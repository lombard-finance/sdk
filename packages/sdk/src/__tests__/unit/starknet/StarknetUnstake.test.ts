/**
 * StarknetUnstake Unit Tests
 *
 * Tests for the Starknet LBTC unstaking action with mocked providers.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StarknetUnstake } from '../../../chains/starknet/actions/unstake/StarknetUnstake';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import { NonEvmOperationStatus } from '../../../shared/constants/statusConstants';
import type { StarknetCoreContext } from '../../../shared/context';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════════

function createMockStarknetService() {
  return {
    signLbtcDestination: vi
      .fn()
      .mockResolvedValue({ signature: '0xmock', pubKey: '0xpub' }),
    unstake: vi
      .fn()
      .mockResolvedValue({ txHash: '0xmock-starknet-tx-hash-xyz789' }),
  };
}

function createMockContext(
  overrides: Partial<StarknetCoreContext> = {},
): StarknetCoreContext {
  return {
    env: Env.testnet,
    partner: new PartnerConfiguration({ partnerId: 'test-partner' }),
    getProvider: vi.fn().mockResolvedValue({}),
    starknet: createMockStarknetService(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('StarknetUnstake', () => {
  let mockCtx: StarknetCoreContext;

  const validParams = {
    assetIn: AssetId.LBTC,
    assetOut: AssetId.BTC,
    sourceChain: Chain.STARKNET_MAINNET,
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
      const unstake = new StarknetUnstake(mockCtx, validParams);
      expect(unstake.status).toBe(NonEvmOperationStatus.IDLE);
    });

    it('should throw for unsupported source chain', () => {
      const invalidParams = {
        ...validParams,
        sourceChain: Chain.ETHEREUM, // Not a Starknet chain
      };

      expect(() => new StarknetUnstake(mockCtx, invalidParams)).toThrow();
    });

    it('should throw for unsupported env/chain combination', () => {
      // testnet env with mainnet chain
      const testnetCtx = createMockContext({ env: Env.testnet });

      expect(() => new StarknetUnstake(testnetCtx, validParams)).toThrow();
    });

    it('should accept valid testnet configuration', () => {
      const testnetCtx = createMockContext({ env: Env.testnet });
      const testnetParams = {
        ...validParams,
        sourceChain: Chain.STARKNET_SEPOLIA,
        destChain: Chain.BITCOIN_SIGNET,
      };

      const unstake = new StarknetUnstake(testnetCtx, testnetParams);
      expect(unstake.status).toBe(NonEvmOperationStatus.IDLE);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Prepare Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('prepare', () => {
    it('should transition to READY status on valid prepare', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);

      await unstake.prepare(validPrepareParams);

      expect(unstake.status).toBe(NonEvmOperationStatus.READY);
      expect(unstake.amount).toBe('0.001');
      expect(unstake.recipient).toBe(validPrepareParams.recipient);
    });

    it('should validate BTC address format', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);

      await expect(
        unstake.prepare({
          amount: '0.001',
          recipient: 'invalid-btc-address',
        }),
      ).rejects.toThrow();
    });

    it('should validate amount is positive', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);

      await expect(
        unstake.prepare({
          amount: '0',
          recipient: validPrepareParams.recipient,
        }),
      ).rejects.toThrow();
    });

    it('should throw if called when not IDLE', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);
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
    it('should call starknet service unstake method', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      const result = await unstake.execute();

      expect(mockCtx.starknet.unstake).toHaveBeenCalledWith({
        amount: validPrepareParams.amount,
        btcAddress: validPrepareParams.recipient,
        env: Env.prod,
      });
      expect(result.txHash).toBe('0xmock-starknet-tx-hash-xyz789');
    });

    it('should transition to COMPLETED status', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(unstake.status).toBe(NonEvmOperationStatus.COMPLETED);
    });

    it('should throw if called when not READY', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);

      await expect(unstake.execute()).rejects.toThrow(/execute/);
    });

    it('should handle service errors', async () => {
      mockCtx.starknet.unstake = vi
        .fn()
        .mockRejectedValue(new Error('Starknet transaction rejected'));

      const unstake = new StarknetUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await expect(unstake.execute()).rejects.toThrow(
        'Starknet transaction rejected',
      );
      expect(unstake.isFailed).toBe(true);
    });

    it('should set txHash property on success', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(unstake.txHash).toBe('0xmock-starknet-tx-hash-xyz789');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Event Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('events', () => {
    it('should emit progress events during prepare', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);
      const progressHandler = vi.fn();

      unstake.on('progress', progressHandler);
      await unstake.prepare(validPrepareParams);

      expect(progressHandler).toHaveBeenCalled();
    });

    it('should emit completed event after execute', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);
      const completedHandler = vi.fn();

      unstake.on('completed', completedHandler);
      await unstake.prepare(validPrepareParams);
      await unstake.execute();

      expect(completedHandler).toHaveBeenCalled();
    });

    it('should emit error event on failure', async () => {
      mockCtx.starknet.unstake = vi
        .fn()
        .mockRejectedValue(new Error('Starknet error'));

      const unstake = new StarknetUnstake(mockCtx, validParams);
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
      const unstake = new StarknetUnstake(mockCtx, validParams);
      const loadingStates: boolean[] = [];

      unstake.on('loading', (isLoading) => loadingStates.push(isLoading));
      await unstake.prepare(validPrepareParams);

      expect(loadingStates).toContain(true);
      expect(unstake.isLoading).toBe(false);
    });

    it('should set isLoading during execute', async () => {
      const unstake = new StarknetUnstake(mockCtx, validParams);
      await unstake.prepare(validPrepareParams);

      const loadingStates: boolean[] = [];
      unstake.on('loading', (isLoading) => loadingStates.push(isLoading));

      await unstake.execute();

      expect(loadingStates).toContain(true);
      expect(unstake.isLoading).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Environment Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('environment handling', () => {
    it('should pass env to service for prod', async () => {
      const prodCtx = createMockContext({ env: Env.prod });
      const unstake = new StarknetUnstake(prodCtx, validParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(prodCtx.starknet.unstake).toHaveBeenCalledWith(
        expect.objectContaining({ env: Env.prod }),
      );
    });

    it('should pass env to service for stage', async () => {
      const stageCtx = createMockContext({ env: Env.stage });
      const stageParams = {
        ...validParams,
        sourceChain: Chain.STARKNET_SEPOLIA,
        destChain: Chain.BITCOIN_SIGNET,
      };
      const unstake = new StarknetUnstake(stageCtx, stageParams);
      await unstake.prepare(validPrepareParams);

      await unstake.execute();

      expect(stageCtx.starknet.unstake).toHaveBeenCalledWith(
        expect.objectContaining({ env: Env.stage }),
      );
    });
  });
});
