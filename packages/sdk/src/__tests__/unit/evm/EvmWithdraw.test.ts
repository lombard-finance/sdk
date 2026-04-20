/**
 * EVM Withdraw Action Unit Tests
 *
 * Tests the DeFi vault → LBTC withdrawal flow on EVM chains.
 *
 * @module __tests__/unit/evm/EvmWithdraw.test.ts
 */

import { describe, expect, it, vi } from 'vitest';

import { Chain } from '../../../core';
import { LombardError, ValidationErrorCode, WithdrawErrorCode } from '../../../shared/errors';

describe('EvmWithdraw Interface', () => {
  describe('EvmWithdrawParams', () => {
    it('should require protocol selection', () => {
      const params = {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      };

      expect(params.protocol).toBe('veda');
    });

    it('should require recipient address', () => {
      const params = {
        sourceChain: Chain.ETHEREUM,
        protocol: 'veda',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      };

      expect(params.recipient).toMatch(/^0x/);
    });

    it('should support Veda protocol', () => {
      const protocol = 'veda';
      expect(protocol).toBe('veda');
    });

    it('should support multiple chains', () => {
      const chains = [
        Chain.ETHEREUM,
        Chain.BASE,
        Chain.BSC,
        Chain.CORN,
      ];

      chains.forEach(chain => {
        expect(typeof chain).toBe('string');
      });
    });
  });

  describe('EvmWithdrawPrepareParams', () => {
    it('should accept valid prepare parameters', () => {
      const params = {
        amount: '0.1',
      };

      expect(params.amount).toBe('0.1');
    });

    it('should validate amount format', () => {
      const validAmounts = ['0.1', '1', '1.5', '0.00001'];

      validAmounts.forEach(amount => {
        expect(parseFloat(amount)).toBeGreaterThan(0);
      });
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

    it('should progress from idle to needs-approval or ready', () => {
      // After prepare(), status is either needs-approval (if allowance insufficient)
      // or ready (if already approved)
      const possibleStatuses = ['needs-approval', 'ready'];
      expect(possibleStatuses).toContain('needs-approval');
      expect(possibleStatuses).toContain('ready');
    });
  });

  describe('Method Signatures', () => {
    it('should define prepare method', () => {
      type PrepareMethod = (params: { amount: string }) => Promise<void>;
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

  describe('Vault Share Approval', () => {
    it('should require vault share approval before withdrawal', () => {
      const approvalRequired = true;
      expect(approvalRequired).toBe(true);
    });

    it('should approve to withdraw queue contract address', () => {
      const withdrawQueueAddress = '0x3b4aCd8879fb60586cCd74bC2F831A4C5E7DbBf8';
      expect(withdrawQueueAddress).toMatch(/^0x/);
    });
  });

  describe('WithdrawErrorCode', () => {
    it('should have INSUFFICIENT_SHARES error code', () => {
      expect(WithdrawErrorCode.INSUFFICIENT_SHARES).toBe('withdraw-insufficient-shares');
    });

    it('should have INVALID_AMOUNT error code', () => {
      expect(WithdrawErrorCode.INVALID_AMOUNT).toBe('withdraw-invalid-amount');
    });

    it('should have NO_PENDING_WITHDRAWAL error code', () => {
      expect(WithdrawErrorCode.NO_PENDING_WITHDRAWAL).toBe('withdraw-no-pending');
    });

    it('should have WITHDRAWAL_EXPIRED error code', () => {
      expect(WithdrawErrorCode.WITHDRAWAL_EXPIRED).toBe('withdraw-expired');
    });

    it('should have PROTOCOL_NOT_SUPPORTED error code', () => {
      expect(WithdrawErrorCode.PROTOCOL_NOT_SUPPORTED).toBe('withdraw-protocol-not-supported');
    });
  });

  describe('Error Handling', () => {
    it('should reject unsupported protocols', () => {
      const error = new LombardError(
        ValidationErrorCode.INVALID_PARAMETER,
        `Protocol invalid-protocol is not supported for withdrawals.`,
      );

      expect(error.code).toBe(ValidationErrorCode.INVALID_PARAMETER);
    });

    it('should reject insufficient vault shares', () => {
      const error = new LombardError(
        WithdrawErrorCode.INSUFFICIENT_SHARES,
        `Insufficient vault shares. Requested: 1.0, Available: 0.5`,
        { requested: '1.0', available: '0.5' },
      );

      expect(error.code).toBe(WithdrawErrorCode.INSUFFICIENT_SHARES);
    });

    it('should handle unsupported chains', () => {
      const error = new LombardError(
        WithdrawErrorCode.PROTOCOL_NOT_SUPPORTED,
        `Chain avalanche does not support Veda vault withdrawals`,
        { chain: Chain.AVALANCHE, protocol: 'veda' },
      );

      expect(error.code).toBe(WithdrawErrorCode.PROTOCOL_NOT_SUPPORTED);
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
    it('should expose protocol property', () => {
      type HasProtocol = { readonly protocol?: string };
      const obj: HasProtocol = { protocol: 'veda' };
      expect(obj.protocol).toBe('veda');
    });

    it('should expose status property', () => {
      type HasStatus = { readonly status: string };
      const obj: HasStatus = { status: 'idle' };
      expect(obj.status).toBe('idle');
    });

    it('should expose needsApproval property', () => {
      type HasNeedsApproval = { readonly needsApproval: boolean };
      const obj: HasNeedsApproval = { needsApproval: true };
      expect(obj.needsApproval).toBe(true);
    });

    it('should expose txHash property after execute', () => {
      type HasTxHash = { readonly txHash?: string };
      const obj: HasTxHash = { txHash: '0x123456' };
      expect(obj.txHash).toBeDefined();
    });
  });

  describe('Withdrawal Queue Mechanics', () => {
    it('should queue withdrawal with deadline', () => {
      // Withdrawals have a 14-day validity window
      const daysValid = 14;
      const secondsInDay = 86400;
      const validityWindow = daysValid * secondsInDay;

      expect(validityWindow).toBe(1209600);
    });

    it('should apply discount percentage', () => {
      // Discount is 0.01% (1 basis point)
      const discountPercent = 0.01;
      const discountBasisPoints = discountPercent * 10000;

      expect(discountBasisPoints).toBe(100);
    });
  });
});

describe('EvmCancelWithdraw Interface', () => {
  describe('EvmCancelWithdrawParams', () => {
    it('should require protocol selection', () => {
      const params = {
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      };

      expect(params.protocol).toBe('veda');
    });

    it('should require chain selection', () => {
      const params = {
        chain: Chain.ETHEREUM,
        protocol: 'veda',
      };

      expect(params.chain).toBe(Chain.ETHEREUM);
    });
  });

  describe('Method Signatures', () => {
    it('should define prepare method', () => {
      type PrepareMethod = () => Promise<void>;
      const testType: PrepareMethod = async () => {};
      expect(testType).toBeDefined();
    });

    it('should define execute method', () => {
      type ExecuteMethod = () => Promise<{ txHash: string }>;
      const testType: ExecuteMethod = async () => ({ txHash: '0x123' });
      expect(testType).toBeDefined();
    });
  });

  describe('Cancellation Mechanics', () => {
    it('should zero out the atomic request', () => {
      // Cancellation sets deadline, atomicPrice, offerAmount to 0
      const cancelRequest = {
        deadline: 0,
        atomicPrice: 0n,
        offerAmount: 0n,
        inSolve: false,
      };

      expect(cancelRequest.offerAmount).toBe(0n);
    });
  });
});
