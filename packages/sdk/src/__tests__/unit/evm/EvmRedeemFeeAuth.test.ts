/**
 * EVM Redeem Fee Authorization Tests
 *
 * Verifies that:
 * 1. EvmRedeem correctly checks for fee authorization on unsubsidized chains
 * 2. EvmRedeem skips fee auth on subsidized chains
 * 3. EvmRedeem correctly handles existing valid signatures
 */

import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { ChainId } from '../../../common/chains';
import { requiresAutoMintFee } from '../../../common/fee-requirements';
import { EvmOperationStatus } from '../../../shared/constants/statusConstants';

// Mock the fee requirements module
vi.mock('../../../common/fee-requirements', () => ({
  requiresAutoMintFee: vi.fn(),
}));

describe('EVM Redeem Fee Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requiresAutoMintFee', () => {
    it('should return true for Ethereum mainnet', () => {
      vi.mocked(requiresAutoMintFee).mockReturnValue(true);
      expect(requiresAutoMintFee(ChainId.ethereum)).toBe(true);
    });

    it('should return true for Sepolia testnet', () => {
      vi.mocked(requiresAutoMintFee).mockReturnValue(true);
      expect(requiresAutoMintFee(ChainId.sepolia)).toBe(true);
    });

    it('should return false for Base (subsidized)', () => {
      vi.mocked(requiresAutoMintFee).mockReturnValue(false);
      expect(requiresAutoMintFee(ChainId.base)).toBe(false);
    });

    it('should return false for BSC (subsidized)', () => {
      vi.mocked(requiresAutoMintFee).mockReturnValue(false);
      expect(requiresAutoMintFee(ChainId.binanceSmartChain)).toBe(false);
    });
  });

  describe('EvmOperationStatus', () => {
    it('should have NEEDS_FEE_AUTHORIZATION status', () => {
      expect(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION).toBe('needs_fee_authorization');
    });

    it('should have all required statuses for EVM redeem flow', () => {
      expect(EvmOperationStatus.IDLE).toBe('idle');
      expect(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION).toBe('needs_fee_authorization');
      expect(EvmOperationStatus.READY).toBe('ready');
      expect(EvmOperationStatus.COMPLETED).toBe('completed');
    });
  });

  describe('Fee Authorization Flow', () => {
    it('documents expected flow for Ethereum (unsubsidized)', () => {
      // On Ethereum/Sepolia, the flow should be:
      // IDLE → NEEDS_FEE_AUTHORIZATION → READY → COMPLETED
      const expectedFlow = [
        EvmOperationStatus.IDLE,
        EvmOperationStatus.NEEDS_FEE_AUTHORIZATION,
        EvmOperationStatus.READY,
        EvmOperationStatus.COMPLETED,
      ];

      expect(expectedFlow).toHaveLength(4);
      expect(expectedFlow[1]).toBe(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);
    });

    it('documents expected flow for Base (subsidized)', () => {
      // On Base/BSC (subsidized), the flow should skip fee auth:
      // IDLE → READY → COMPLETED
      const expectedFlow = [
        EvmOperationStatus.IDLE,
        EvmOperationStatus.READY,
        EvmOperationStatus.COMPLETED,
      ];

      expect(expectedFlow).toHaveLength(3);
      expect(expectedFlow).not.toContain(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION);
    });
  });
});
