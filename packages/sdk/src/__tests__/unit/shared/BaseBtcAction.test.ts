import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { BaseBtcAction, BaseBtcParams, StatusConfig, StepDefinition } from '../../../chains/btc/actions/shared/BaseBtcAction';
import { ChainId } from '../../../common/chains';
import { Chain, StepStatus } from '../../../core';
import { BtcCoreContext } from '../../../shared/context';

// Mock context
const mockCtx = {
  api: {
    getDepositAddress: vi.fn(),
    generateDepositAddress: vi.fn(),
    getDeposits: vi.fn() },
  partner: {
    getPartnerId: vi.fn() } } as unknown as BtcCoreContext;

// Concrete implementation
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock with generic step definition
class TestBtcAction extends BaseBtcAction<any, string, BaseBtcParams> {
  protected getAddressSchema() {
    return z.string().startsWith('0x');
  }
  protected getStatusConfig(): StatusConfig<string> {
    return {
      idle: 'idle',
      ready: 'ready',
      addressReady: 'address_ready' };
  }
  protected getInitialSteps(): StepDefinition {
    return { step1: StepStatus.IDLE };
  }
  protected isAuthorized(): boolean {
    return true;
  }
  protected getChainId() {
    return ChainId.sepolia;
  }
  protected getDepositAddressParams(captchaToken?: string) {
    return {
      address: '0x123',
      chainId: ChainId.sepolia,
      signature: '0xsig',
      token: 'LBTC',
      captchaToken };
  }

  protected getExpectedToken(): string {
    return 'LBTC';
  }

  // Expose for testing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test helper accepts any params for validation testing
  public testValidatePrepareParams(params: any) {
    return this.validatePrepareParams(params);
  }
  public async testResumeFromExistingDeposit(recipient: string) {
    return this.resumeFromExistingDeposit(recipient);
  }
}

describe('BaseBtcAction', () => {
  const params = { destChain: Chain.SEPOLIA };

  it('should validate prepare params with correct schema', () => {
    const action = new TestBtcAction(mockCtx, params, 'idle');
    
    // Valid params
    expect(() => action.testValidatePrepareParams({
      amount: '0.001',
      recipient: '0x123' })).not.toThrow();

    // Invalid amount (too low)
    expect(() => action.testValidatePrepareParams({
      amount: '0.00001', // Below 0.0002 minimum
      recipient: '0x123' })).toThrow(/at least 0.0002/);

    // Invalid recipient (schema check)
    expect(() => action.testValidatePrepareParams({
      amount: '0.001',
      recipient: 'invalid', // Must start with 0x
    })).toThrow();
  });

  it('should resume from existing deposit if found', async () => {
    vi.mocked(mockCtx.api.getDepositAddress).mockResolvedValue('tb1existing...');
    
    const action = new TestBtcAction(mockCtx, params, 'idle');
    const resumed = await action.testResumeFromExistingDeposit('0x123');
    
    expect(resumed).toBe(true);
    expect(action.depositAddress).toBe('tb1existing...');
    // resumeFromExistingDeposit does not update status; caller must handle it
    expect(action.status).toBe('idle');
  });

  it('should not resume if no existing deposit', async () => {
    vi.mocked(mockCtx.api.getDepositAddress).mockResolvedValue(undefined as unknown as string); // SDK types might return null/undefined
    
    const action = new TestBtcAction(mockCtx, params, 'idle');
    const resumed = await action.testResumeFromExistingDeposit('0x123');
    
    expect(resumed).toBe(false);
    expect(action.depositAddress).toBeUndefined();
    expect(action.status).toBe('idle');
  });
});

