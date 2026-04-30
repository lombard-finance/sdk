/**
 * SolanaRedeem Unit Tests
 *
 * Tests for the Solana BTC.b → BTC redeem action with mocked providers.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SolanaRedeem } from '../../../chains/solana/actions/redeem/SolanaRedeem';
import { envToSolanaChain } from '../../../chains/solana/utils';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { AssetId, Chain } from '../../../core';
import { NonEvmOperationStatus } from '../../../shared/constants/statusConstants';
import type { SolanaCoreContext } from '../../../shared/context';
import { getSolanaTokenAddress, Token } from '../../../tokens/token-addresses';

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
    deposit: vi.fn().mockResolvedValue({ signature: 'mock-deposit-tx-hash' }) };
}

function createMockContext(
  overrides: Partial<SolanaCoreContext> = {},
): SolanaCoreContext {
  return {
    env: Env.dev,
    partner: new PartnerConfiguration({ partnerId: 'test-partner' }),
    getProvider: vi.fn().mockResolvedValue({}),
    solana: createMockSolanaService(),
    ...overrides };
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SolanaRedeem — BTC.b → BTC', () => {
  let mockCtx: SolanaCoreContext;

  const validParams = {
    assetIn: AssetId.BTCb,
    assetOut: AssetId.BTC,
    sourceChain: Chain.SOLANA_DEVNET,
    destChain: Chain.BITCOIN_SIGNET };

  const validPrepareParams = {
    amount: '0.001',
    recipient: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' };

  beforeEach(() => {
    mockCtx = createMockContext({ env: Env.dev });
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with IDLE status in dev env', () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      expect(redeem.status).toBe(NonEvmOperationStatus.IDLE);
    });

    it('should initialize with IDLE status in stage env', () => {
      const stageCtx = createMockContext({ env: Env.stage });
      const redeem = new SolanaRedeem(stageCtx, validParams);
      expect(redeem.status).toBe(NonEvmOperationStatus.IDLE);
    });

    it('should initialize with IDLE status in prod env', () => {
      const prodCtx = createMockContext({ env: Env.prod });
      const prodParams = {
        ...validParams,
        sourceChain: Chain.SOLANA_MAINNET,
        destChain: Chain.BITCOIN_MAINNET };
      const redeem = new SolanaRedeem(prodCtx, prodParams);
      expect(redeem.status).toBe(NonEvmOperationStatus.IDLE);
    });

    it('should throw for unsupported source chain', () => {
      const invalidParams = {
        ...validParams,
        sourceChain: Chain.ETHEREUM };
      expect(() => new SolanaRedeem(mockCtx, invalidParams)).toThrow();
    });
  });

  describe('prepare', () => {
    it('should transition to READY status on valid prepare', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);

      await redeem.prepare(validPrepareParams);

      expect(redeem.status).toBe(NonEvmOperationStatus.READY);
      expect(redeem.amount).toBe('0.001');
      expect(redeem.recipient).toBe(validPrepareParams.recipient);
    });

    it('should validate BTC address format', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);

      await expect(
        redeem.prepare({ amount: '0.001', recipient: 'invalid-address' }),
      ).rejects.toThrow();
    });

    it('should validate amount is positive', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);

      await expect(
        redeem.prepare({ amount: '0', recipient: validPrepareParams.recipient }),
      ).rejects.toThrow();
    });

    it('should throw if called when not IDLE', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      await expect(redeem.prepare(validPrepareParams)).rejects.toThrow(/prepare/);
    });
  });

  describe('execute', () => {
    it('should call solana service redeemForBtc method', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      const result = await redeem.execute();

      expect(mockCtx.solana.redeemForBtc).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.any(String),
          btcAddress: validPrepareParams.recipient,
          network: 'devnet',
          env: Env.dev,
          tokenMint: getSolanaTokenAddress(
            envToSolanaChain(Env.dev),
            Env.dev,
            Token.BTCb,
          ) }),
      );
      expect(result.txHash).toBe('mock-redeemForBtc-tx-hash');
    });

    it('should NOT call solana service redeem or unstake', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      await redeem.execute();

      expect(mockCtx.solana.redeem).not.toHaveBeenCalled();
    });

    it('should transition to COMPLETED status after execute', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      await redeem.execute();

      expect(redeem.status).toBe(NonEvmOperationStatus.COMPLETED);
    });

    it('should throw if called when not READY', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);

      await expect(redeem.execute()).rejects.toThrow(/execute/);
    });

    it('should set txHash property on success', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      await redeem.execute();

      expect(redeem.txHash).toBe('mock-redeemForBtc-tx-hash');
    });

    it('should handle service errors', async () => {
      mockCtx.solana.redeemForBtc = vi
        .fn()
        .mockRejectedValue(new Error('Transaction failed'));

      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);

      await expect(redeem.execute()).rejects.toThrow('Transaction failed');
      expect(redeem.isFailed).toBe(true);
    });
  });

  describe('network mapping', () => {
    it('should use devnet for dev env', async () => {
      const redeem = new SolanaRedeem(mockCtx, validParams);
      await redeem.prepare(validPrepareParams);
      await redeem.execute();

      expect(mockCtx.solana.redeemForBtc).toHaveBeenCalledWith(
        expect.objectContaining({ network: 'devnet' }),
      );
    });

    it('should use devnet for stage env', async () => {
      const stageCtx = createMockContext({ env: Env.stage });
      const redeem = new SolanaRedeem(stageCtx, validParams);
      await redeem.prepare(validPrepareParams);
      await redeem.execute();

      expect(stageCtx.solana.redeemForBtc).toHaveBeenCalledWith(
        expect.objectContaining({
          network: 'devnet',
          tokenMint: getSolanaTokenAddress(
            envToSolanaChain(Env.stage),
            Env.stage,
            Token.BTCb,
          ) }),
      );
    });
  });
});
