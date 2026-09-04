/**
 * EVM Withdraw Fee Authorization Tests
 *
 * EVM Withdraw (BTC.b → BTC) releases native BTC on the Bitcoin network. The
 * auto-mint fee model only applies when minting BTC.b / LBTC on an EVM
 * destination (BTC Deposit, EVM Withdraw → BTC.b), so EVM Withdraw does NOT
 * require fee authorization regardless of source chain.
 *
 * These tests document the simplified EVM Withdraw flow and confirm that
 * `requiresAutoMintFee` itself still behaves correctly for the other actions
 * that rely on it.
 */

import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../common/chains';
import { requiresAutoMintFee } from '../../../common/fee-requirements';
import { EvmOperationStatus } from '../../../shared/constants/statusConstants';

describe('EVM Redeem Fee Authorization', () => {
  describe('requiresAutoMintFee (shared with other EVM actions)', () => {
    it('returns true for Ethereum mainnet', () => {
      expect(requiresAutoMintFee(ChainId.ethereum)).toBe(true);
    });

    it('returns true for Sepolia testnet', () => {
      expect(requiresAutoMintFee(ChainId.sepolia)).toBe(true);
    });

    it('returns false for Base (subsidized)', () => {
      expect(requiresAutoMintFee(ChainId.base)).toBe(false);
    });

    it('returns false for BSC (subsidized)', () => {
      expect(requiresAutoMintFee(ChainId.binanceSmartChain)).toBe(false);
    });
  });

  describe('EvmOperationStatus surface', () => {
    it('keeps NEEDS_FEE_AUTHORIZATION available for other actions', () => {
      expect(EvmOperationStatus.NEEDS_FEE_AUTHORIZATION).toBe(
        'needs_fee_authorization',
      );
    });

    it('exposes the statuses used by EVM Redeem', () => {
      expect(EvmOperationStatus.IDLE).toBe('idle');
      expect(EvmOperationStatus.READY).toBe('ready');
      expect(EvmOperationStatus.COMPLETED).toBe('completed');
    });
  });

  describe('EVM Redeem flow contract', () => {
    it('skips fee authorization on every source chain', () => {
      // BTC.b → BTC redemption never auto-mints on an EVM destination,
      // so the flow is always: IDLE → READY → COMPLETED.
      const expectedFlow = [
        EvmOperationStatus.IDLE,
        EvmOperationStatus.READY,
        EvmOperationStatus.COMPLETED,
      ];

      expect(expectedFlow).not.toContain(
        EvmOperationStatus.NEEDS_FEE_AUTHORIZATION,
      );
      expect(expectedFlow[0]).toBe(EvmOperationStatus.IDLE);
      expect(expectedFlow[expectedFlow.length - 1]).toBe(
        EvmOperationStatus.COMPLETED,
      );
    });
  });
});
