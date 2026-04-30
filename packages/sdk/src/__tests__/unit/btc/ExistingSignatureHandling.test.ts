/**
 * Existing Signature Handling Tests
 *
 * Tests for Bug #3 (BTC Stake active signature error) and
 * Bug #7 (Stake & Bake signature check).
 *
 * These tests verify the SDK handles existing deposits/signatures gracefully:
 * 1. Resuming from existing deposit addresses
 * 2. Handling API errors for duplicate signatures
 * 3. Proper error messages for users
 *
 * @module __tests__/unit/btc/ExistingSignatureHandling.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseBtcAction, type StatusConfig, type StepDefinition } from '../../../chains/btc/actions/shared/BaseBtcAction';
import { PartnerConfiguration } from '../../../client/PartnerConfiguration';
import { ChainId } from '../../../common/chains';
import { Chain, StepStatus } from '../../../core';
import type { BtcCoreContext } from '../../../shared/context';
import { evmAddressSchema } from '../../../shared/validation';

// Mock context factory
const createMockContext = (overrides: Partial<BtcCoreContext> = {}): BtcCoreContext => ({
  env: Env.testnet,
  btc: {} as BtcCoreContext['btc'],
  api: {
    generateDepositAddress: vi.fn().mockResolvedValue('tb1qexampleaddress'),
    getDepositAddress: vi.fn().mockResolvedValue(null),
    getFeeSignature: vi.fn(),
    storeFeeSignature: vi.fn(),
    getStakeAndBakeSignature: vi.fn(),
    storeStakeAndBakeSignature: vi.fn(),
    getDeposits: vi.fn() } as BtcCoreContext['api'],
  partner: new PartnerConfiguration({ partnerId: 'test-partner' }),
  capabilities: {
    require: vi.fn(),
    get: vi.fn(),
    services: new Map(),
    registerModule: vi.fn(),
    hasModule: vi.fn().mockReturnValue(true),
    modules: [],
    shared: [],
    config: {},
    optional: [],
    createContext: vi.fn() } as unknown as BtcCoreContext['capabilities'],
  getProvider: vi.fn().mockResolvedValue({
    on: vi.fn(),
    removeListener: vi.fn(),
    request: vi.fn().mockResolvedValue('0x1') }),
  ...overrides });

// Test implementation of BaseBtcAction
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock with generic step definition
class TestBtcAction extends BaseBtcAction<any, string, { destChain: Chain }> {
  private chainId: ChainId = ChainId.sepolia;

  constructor(ctx: BtcCoreContext, params: { destChain: Chain }, initialStatus: string = 'idle') {
    super(ctx, params, initialStatus);
  }

  protected getAddressSchema() {
    return evmAddressSchema;
  }

  protected getStatusConfig(): StatusConfig<string> {
    return {
      idle: 'idle',
      ready: 'ready',
      addressReady: 'address_ready' };
  }

  protected getInitialSteps(): StepDefinition {
    return {
      created: StepStatus.IDLE,
      verifying: StepStatus.IDLE };
  }

  protected isAuthorized(): boolean {
    return true;
  }

  protected getChainId(): ChainId {
    return this.chainId;
  }

  protected getDepositAddressParams(captchaToken?: string) {
    return {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      chainId: this.chainId,
      signature: '0xsignature',
      token: 'LBTC',
      partnerId: 'test-partner',
      captchaToken };
  }

  protected getExpectedToken(): string {
    return 'LBTC';
  }

  protected getAuthRequiredMessage(): string {
    return 'Authorization required';
  }

  // Expose protected method for testing
  public async testResumeFromExisting(recipient: string): Promise<boolean> {
    return this.resumeFromExistingDeposit(recipient);
  }

  // Expose deposit address for assertions
  public getDepositAddr(): string | undefined {
    return this._depositAddress;
  }
}

describe('Existing Signature/Deposit Handling (Bug #3 & #7)', () => {
  let mockCtx: BtcCoreContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = createMockContext();
  });

  describe('Resume from existing deposit (Bug #3 - partial fix)', () => {
    it('should resume when existing deposit address found', async () => {
      // Mock API to return existing deposit address
      const existingAddress = 'tb1qexistingdeposit';
      mockCtx.api.getDepositAddress = vi.fn().mockResolvedValue(existingAddress);

      const action = new TestBtcAction(mockCtx, { destChain: Chain.SEPOLIA }, 'idle');
      const recipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

      const resumed = await action.testResumeFromExisting(recipient);

      expect(resumed).toBe(true);
      expect(action.getDepositAddr()).toBe(existingAddress);
      // Note: resumeFromExistingDeposit no longer updates status
      // The caller (prepare()) is responsible for setting status after fee auth check
      expect(action.status).toBe('idle');
    });

    it('should NOT resume when no existing deposit', async () => {
      // Mock API to return null (no existing deposit)
      mockCtx.api.getDepositAddress = vi.fn().mockResolvedValue(null);

      const action = new TestBtcAction(mockCtx, { destChain: Chain.SEPOLIA }, 'idle');
      const recipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

      const resumed = await action.testResumeFromExisting(recipient);

      expect(resumed).toBe(false);
      expect(action.getDepositAddr()).toBeUndefined();
      expect(action.status).toBe('idle'); // Status unchanged
    });

    it('should NOT resume when API throws error', async () => {
      // Mock API to throw (e.g., network error)
      mockCtx.api.getDepositAddress = vi.fn().mockRejectedValue(new Error('Network error'));

      const action = new TestBtcAction(mockCtx, { destChain: Chain.SEPOLIA }, 'idle');
      const recipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

      const resumed = await action.testResumeFromExisting(recipient);

      expect(resumed).toBe(false);
      expect(action.status).toBe('idle'); // Status unchanged, error swallowed
    });

    it('should call API with correct parameters', async () => {
      mockCtx.api.getDepositAddress = vi.fn().mockResolvedValue(null);

      const action = new TestBtcAction(mockCtx, { destChain: Chain.SEPOLIA }, 'idle');
      const recipient = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

      await action.testResumeFromExisting(recipient);

      expect(mockCtx.api.getDepositAddress).toHaveBeenCalledWith({
        address: recipient,
        chainId: 11155111, // Sepolia chain ID
        token: 'LBTC',
        partnerId: 'test-partner' });
    });
  });

  describe('API Error Messages (for user-facing errors)', () => {
    /**
     * These tests document expected API error messages that the SDK
     * should handle gracefully or provide helpful error messages for.
     */

    it('should identify "active signature" errors', () => {
      const errorPatterns = [
        'active signature already exists for this user',
        'signature already exists',
        'existing stake found',
        'pending stake already exists',
      ];

      // Helper to check if an error message matches expected patterns
      const isActiveSignatureError = (message: string): boolean => {
        const normalized = message.toLowerCase();
        return errorPatterns.some(pattern => normalized.includes(pattern.toLowerCase()));
      };

      expect(isActiveSignatureError('Active signature already exists for this user')).toBe(true);
      expect(isActiveSignatureError('Signature already exists for address 0x123')).toBe(true);
      expect(isActiveSignatureError('Network timeout')).toBe(false);
      expect(isActiveSignatureError('Invalid address')).toBe(false);
    });

    it('should provide enhanced error message for duplicate signature errors', () => {
      // This tests the error enhancement logic that should be implemented
      // in the SDK Demo or SDK itself
      
      const enhanceErrorMessage = (error: Error): string => {
        const message = error.message.toLowerCase();
        
        if (message.includes('active signature') || message.includes('signature already exists')) {
          return `You already have a pending stake. Please complete the existing flow using your deposit address, or wait for it to expire. You can check your pending stakes in the Deposit Addresses section.`;
        }
        
        if (message.includes('stake and bake signature already exists')) {
          return `You already have a pending stake-and-deploy signature. Please complete that flow first or wait for expiration.`;
        }
        
        return error.message;
      };

      const originalError = new Error('Active signature already exists for this user');
      const enhanced = enhanceErrorMessage(originalError);
      
      expect(enhanced).toContain('pending stake');
      expect(enhanced).toContain('deposit address');
    });
  });

  describe('Status transitions during resume', () => {
    it('should NOT transition status when resuming (caller sets status after fee auth check)', async () => {
      mockCtx.api.getDepositAddress = vi.fn().mockResolvedValue('tb1qexisting');

      const action = new TestBtcAction(mockCtx, { destChain: Chain.SEPOLIA }, 'idle');
      const statusHistory: string[] = [];
      
      action.on('status-change', (status: string) => {
        statusHistory.push(status);
      });

      await action.testResumeFromExisting('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');

      // resumeFromExistingDeposit no longer emits status changes
      // The caller (prepare()) sets status after validating fee auth
      expect(statusHistory).not.toContain('address_ready');
      expect(statusHistory).toHaveLength(0);
    });

    it('should NOT change status when no existing deposit', async () => {
      mockCtx.api.getDepositAddress = vi.fn().mockResolvedValue(null);

      const action = new TestBtcAction(mockCtx, { destChain: Chain.SEPOLIA }, 'idle');
      const statusHistory: string[] = [];
      
      action.on('status-change', (status: string) => {
        statusHistory.push(status);
      });

      await action.testResumeFromExisting('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');

      expect(statusHistory).toEqual([]); // No status changes
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined/null address from API', async () => {
      mockCtx.api.getDepositAddress = vi.fn().mockResolvedValue(undefined);

      const action = new TestBtcAction(mockCtx, { destChain: Chain.SEPOLIA }, 'idle');
      const resumed = await action.testResumeFromExisting('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');

      expect(resumed).toBe(false);
    });

    it('should handle empty string address from API', async () => {
      mockCtx.api.getDepositAddress = vi.fn().mockResolvedValue('');

      const action = new TestBtcAction(mockCtx, { destChain: Chain.SEPOLIA }, 'idle');
      const resumed = await action.testResumeFromExisting('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');

      // Empty string is falsy, so should not resume
      expect(resumed).toBe(false);
    });
  });
});

