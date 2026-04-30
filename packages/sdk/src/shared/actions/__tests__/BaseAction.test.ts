/**
 * Tests for BaseAction abstract class
 */

import { describe, expect, it, vi } from 'vitest';

import type { StrategyProgress } from '../../../core/types';
import { ErrorCode, LombardError } from '../../errors';
import { DepositEvent, type DepositEventMap } from '../../events';
import { BaseAction } from '../BaseAction';

// Concrete implementation for testing
class TestAction extends BaseAction<DepositEventMap, string> {
  constructor() {
    super('idle');
  }

  // Expose protected methods for testing
  public testEmitProgress(progress: StrategyProgress<string>): void {
    this.emitProgress(progress);
  }

  public testUpdateStatus(status: string): void {
    this.updateStatus(status);
  }

  public testEmitCompleted(): void {
    this.updateStatus('completed');
    this.emitCompleted();
  }

  public testEmitFailed(): void {
    this.updateStatus('failed');
    this.emitFailed();
  }

  public testEmitError(error: LombardError): void {
    this._error = error;
    this.emitError(error);
  }

  public testAssertStatus(expected: string | string[], action: string): void {
    this.assertStatus(expected, action);
  }

  public testGuard<T>(fn: () => Promise<T>): Promise<T> {
    return this.act(fn);
  }

  public testIsFailed(): boolean {
    return this.isFailed;
  }

  public testClearError(): void {
    this.clearError();
  }

  public testClear(): void {
    this.clearListeners();
  }
}

describe('BaseAction', () => {
  it('should create an action with initial state', () => {
    const action = new TestAction();
    expect(action.status).toBe('idle');
    expect(action.error).toBeNull();
  });

  it('should register and call progress handlers', () => {
    const action = new TestAction();
    const handler = vi.fn();

    action.on(DepositEvent.Progress, handler);
    action.testEmitProgress({
      status: 'executing',
      steps: { approval: 'complete' } });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      status: 'executing',
      steps: { approval: 'complete' } });
  });

  it('should register and call status change handlers', () => {
    const action = new TestAction();
    const handler = vi.fn();

    action.on(DepositEvent.StatusChange, handler);
    action.testUpdateStatus('ready');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('ready');
  });

  it('should register and call completed handlers', () => {
    const action = new TestAction();
    const handler = vi.fn();

    action.on(DepositEvent.Completed, handler);
    action.testEmitCompleted();

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should register and call failed handlers', () => {
    const action = new TestAction();
    const handler = vi.fn();

    action.on(DepositEvent.Failed, handler);
    action.testEmitFailed();

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should register and call error handlers', () => {
    const action = new TestAction();
    const handler = vi.fn();
    const error = new LombardError(ErrorCode.UNKNOWN_ERROR, 'Test error');

    action.on(DepositEvent.Error, handler);
    action.testEmitError(error);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(error);
    expect(action.error).toBe(error);
  });

  it('should return unsubscribe function from on()', () => {
    const action = new TestAction();
    const handler = vi.fn();

    const unsubscribe = action.on(DepositEvent.Progress, handler);
    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
    action.testEmitProgress({ status: 'ready', steps: {} });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should support multiple handlers for same event', () => {
    const action = new TestAction();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    action.on(DepositEvent.Completed, handler1);
    action.on(DepositEvent.Completed, handler2);
    action.testEmitCompleted();

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should clear all listeners', () => {
    const action = new TestAction();
    const progressHandler = vi.fn();
    const statusHandler = vi.fn();
    const completedHandler = vi.fn();

    action.on(DepositEvent.Progress, progressHandler);
    action.on(DepositEvent.StatusChange, statusHandler);
    action.on(DepositEvent.Completed, completedHandler);

    action.testClear();

    action.testEmitProgress({ status: 'ready', steps: {} });
    action.testUpdateStatus('ready');
    action.testEmitCompleted();

    expect(progressHandler).not.toHaveBeenCalled();
    expect(statusHandler).not.toHaveBeenCalled();
    expect(completedHandler).not.toHaveBeenCalled();
  });

  it('should maintain status property', () => {
    const action = new TestAction();
    expect(action.status).toBe('idle');

    action.testUpdateStatus('preparing');
    expect(action.status).toBe('preparing');

    action.testEmitCompleted();
    expect(action.status).toBe('completed');
  });

  it('should maintain error property', () => {
    const action = new TestAction();
    expect(action.error).toBeNull();

    const error = new LombardError(ErrorCode.UNKNOWN_ERROR, 'Test error');
    action.testEmitError(error);
    expect(action.error).toBe(error);
  });

  it('should handle multiple emissions correctly', () => {
    const action = new TestAction();
    const handler = vi.fn();

    action.on(DepositEvent.Progress, handler);

    action.testEmitProgress({ status: 'preparing', steps: {} });
    action.testEmitProgress({ status: 'ready', steps: {} });
    action.testEmitProgress({ status: 'executing', steps: {} });

    expect(handler).toHaveBeenCalledTimes(3);
  });

  describe('assertStatus', () => {
    it('should pass when status matches single expected', () => {
      const action = new TestAction();
      expect(() => action.testAssertStatus('idle', 'test')).not.toThrow();
    });

    it('should pass when status matches one of expected array', () => {
      const action = new TestAction();
      expect(() =>
        action.testAssertStatus(['idle', 'ready'], 'test'),
      ).not.toThrow();
    });

    it('should throw when status does not match', () => {
      const action = new TestAction();
      expect(() => action.testAssertStatus('ready', 'test')).toThrow();
    });
  });

  describe('act', () => {
    it('should return result on success', async () => {
      const action = new TestAction();
      const result = await action.testGuard(async () => 'success');
      expect(result).toBe('success');
    });

    it('should preserve status on failure and set error', async () => {
      const action = new TestAction();
      const handler = vi.fn();
      action.on(DepositEvent.Failed, handler);

      // Set status to 'preparing' before the failure
      action.testUpdateStatus('preparing');

      await expect(
        action.testGuard(async () => {
          throw new Error('test error');
        }),
      ).rejects.toThrow();

      // Status should be preserved at 'preparing' (NOT changed to 'failed')
      expect(action.status).toBe('preparing');
      expect(action.error).not.toBeNull();
      expect(action.testIsFailed()).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should clear error on retry', async () => {
      const action = new TestAction();

      // First call fails
      await expect(
        action.testGuard(async () => {
          throw new Error('test error');
        }),
      ).rejects.toThrow();

      expect(action.error).not.toBeNull();
      expect(action.testIsFailed()).toBe(true);

      // Second call succeeds - error should be cleared
      const result = await action.testGuard(async () => 'success');
      expect(result).toBe('success');
      expect(action.error).toBeNull();
      expect(action.testIsFailed()).toBe(false);
    });
  });

  describe('isFailed', () => {
    it('should return false when no error', () => {
      const action = new TestAction();
      expect(action.testIsFailed()).toBe(false);
    });

    it('should return true when error is set', () => {
      const action = new TestAction();
      const error = new LombardError(ErrorCode.UNKNOWN_ERROR, 'Test error');
      action.testEmitError(error);
      expect(action.testIsFailed()).toBe(true);
    });
  });
});
