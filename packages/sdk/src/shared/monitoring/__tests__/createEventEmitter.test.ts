/**
 * Tests for strongly-typed event emitter factory
 */

import { describe, expect, it, vi } from 'vitest';

import type { StrategyProgress } from '../../../core/types';
import { ActionEvent, type ActionEventMap } from '../../events';
import { createEventEmitter } from '../createEventEmitter';

describe('createEventEmitter', () => {
  it('should create an event emitter', () => {
    const emitter = createEventEmitter<ActionEventMap>();
    expect(emitter).toBeDefined();
    expect(typeof emitter.on).toBe('function');
    expect(typeof emitter.emit).toBe('function');
    expect(typeof emitter.off).toBe('function');
    expect(typeof emitter.clear).toBe('function');
  });

  it('should register and call event handlers', () => {
    const emitter = createEventEmitter<ActionEventMap>();
    const handler = vi.fn();

    emitter.on(ActionEvent.StatusChange, handler);
    emitter.emit(ActionEvent.StatusChange, 'ready');

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('ready');
  });

  it('should support multiple handlers for same event', () => {
    const emitter = createEventEmitter<ActionEventMap>();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on(ActionEvent.Completed, handler1);
    emitter.on(ActionEvent.Completed, handler2);
    emitter.emit(ActionEvent.Completed);

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should remove specific handler with off()', () => {
    const emitter = createEventEmitter<ActionEventMap>();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const unsub1 = emitter.on(ActionEvent.Completed, handler1);
    emitter.on(ActionEvent.Completed, handler2);

    unsub1(); // Remove first handler
    emitter.emit(ActionEvent.Completed);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should remove handler with returned unsubscribe function', () => {
    const emitter = createEventEmitter<ActionEventMap>();
    const handler = vi.fn();

    const unsubscribe = emitter.on(ActionEvent.StatusChange, handler);
    unsubscribe();
    emitter.emit(ActionEvent.StatusChange, 'ready');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should clear all handlers', () => {
    const emitter = createEventEmitter<ActionEventMap>();
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const handler3 = vi.fn();

    emitter.on(ActionEvent.StatusChange, handler1);
    emitter.on(ActionEvent.Completed, handler2);
    emitter.on(ActionEvent.Progress, handler3);

    emitter.clear();

    emitter.emit(ActionEvent.StatusChange, 'ready');
    emitter.emit(ActionEvent.Completed);
    emitter.emit(ActionEvent.Progress, { status: 'ready', steps: {} });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
    expect(handler3).not.toHaveBeenCalled();
  });

  it('should handle progress events with correct types', () => {
    const emitter = createEventEmitter<ActionEventMap>();
    const handler = vi.fn((progress: StrategyProgress<string>) => {
      expect(progress.status).toBeDefined();
      expect(progress.steps).toBeDefined();
    });

    emitter.on(ActionEvent.Progress, handler);
    emitter.emit(ActionEvent.Progress, {
      status: 'executing',
      steps: {
        approval: 'complete',
        execution: 'pending',
      },
      confirmations: 2,
      requiredConfirmations: 6,
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should not throw if emitting with no handlers', () => {
    const emitter = createEventEmitter<ActionEventMap>();

    expect(() => {
      emitter.emit(ActionEvent.Completed);
      emitter.emit(ActionEvent.StatusChange, 'ready');
    }).not.toThrow();
  });

  it('should handle handler errors gracefully', () => {
    // Mock console.error to suppress expected error output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const emitter = createEventEmitter<ActionEventMap>();
    const errorHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    const normalHandler = vi.fn();

    emitter.on(ActionEvent.Completed, errorHandler);
    emitter.on(ActionEvent.Completed, normalHandler);

    // Should not throw and should still call other handlers
    expect(() => {
      emitter.emit(ActionEvent.Completed);
    }).not.toThrow();

    expect(errorHandler).toHaveBeenCalled();
    expect(normalHandler).toHaveBeenCalled();
    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error in event handler for "completed":',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
