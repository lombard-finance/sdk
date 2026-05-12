/**
 * DevToolsBridge Tests
 *
 * Tests for the core bridge that connects SDK actions to DevTools.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DevToolsBridge,
  getDevToolsBridge,
  resetDevToolsBridge,
} from '../bridge/DevToolsBridge';
import type { MonitorableAction } from '../types';

// Mock action factory
function createMockAction(initialStatus = 'idle'): MonitorableAction & {
  emit: (event: string, data: unknown) => void;
  handlers: Map<string, Array<(...args: unknown[]) => void>>;
} {
  const handlers = new Map<string, Array<(...args: unknown[]) => void>>();

  return {
    status: initialStatus,
    isLoading: false,
    error: null,
    isFailed: false,
    handlers,
    on(event: string, handler: (...args: unknown[]) => void) {
      if (!handlers.has(event)) {
        handlers.set(event, []);
      }
      handlers.get(event)?.push(handler);
      return () => {
        const eventHandlers = handlers.get(event);
        if (eventHandlers) {
          const idx = eventHandlers.indexOf(handler);
          if (idx > -1) eventHandlers.splice(idx, 1);
        }
      };
    },
    emit(event: string, data: unknown) {
      const eventHandlers = handlers.get(event);
      if (eventHandlers) {
        eventHandlers.forEach((h) => {
          h(data);
        });
      }
    },
  };
}

describe('DevToolsBridge', () => {
  let bridge: DevToolsBridge;

  beforeEach(() => {
    bridge = new DevToolsBridge();
  });

  describe('constructor', () => {
    it('should create bridge with default config', () => {
      expect(bridge).toBeDefined();
      expect(bridge.getEvents()).toEqual([]);
      expect(bridge.getActions().size).toBe(0);
    });

    it('should create bridge with custom config', () => {
      const customBridge = new DevToolsBridge({ maxEvents: 10 });
      expect(customBridge).toBeDefined();
    });
  });

  describe('registerAction', () => {
    it('should register an action', () => {
      const action = createMockAction();

      bridge.registerAction('test-action', action);

      const actions = bridge.getActions();
      expect(actions.size).toBe(1);
      expect(actions.has('test-action')).toBe(true);
    });

    it('should emit registered event', () => {
      const action = createMockAction();

      bridge.registerAction('test-action', action);

      const events = bridge.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('registered');
      expect(events[0].source).toBe('test-action');
    });

    it('should return unregister function', () => {
      const action = createMockAction();

      const unregister = bridge.registerAction('test-action', action);
      expect(bridge.getActions().size).toBe(1);

      unregister();
      expect(bridge.getActions().size).toBe(0);
    });

    it('should subscribe to action events', () => {
      const action = createMockAction();

      bridge.registerAction('test-action', action);

      // Emit a status change
      action.emit('status-change', 'new-status');

      const events = bridge.getEvents();
      expect(events.length).toBe(2); // registered + status-change
      expect(events[1].type).toBe('status-change');
      expect(events[1].data).toBe('new-status');
    });
  });

  describe('unregisterAction', () => {
    it('should unregister an action', () => {
      const action = createMockAction();
      bridge.registerAction('test-action', action);

      bridge.unregisterAction('test-action');

      expect(bridge.getActions().size).toBe(0);
    });

    it('should emit unregistered event', () => {
      const action = createMockAction();
      bridge.registerAction('test-action', action);

      bridge.unregisterAction('test-action');

      const events = bridge.getEvents();
      const unregEvent = events.find((e) => e.type === 'unregistered');
      expect(unregEvent).toBeDefined();
    });

    it('should unsubscribe from action events', () => {
      const action = createMockAction();
      bridge.registerAction('test-action', action);
      bridge.unregisterAction('test-action');

      // Emit after unregister
      const eventsBefore = bridge.getEvents().length;
      action.emit('status-change', 'ignored');

      // Should not add new event
      expect(bridge.getEvents().length).toBe(eventsBefore);
    });
  });

  describe('event listeners', () => {
    it('should notify listeners on new events', () => {
      const listener = vi.fn();
      bridge.onEvent(listener);

      const action = createMockAction();
      bridge.registerAction('test', action);

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing from events', () => {
      const listener = vi.fn();
      const unsub = bridge.onEvent(listener);
      unsub();

      const action = createMockAction();
      bridge.registerAction('test', action);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('state listeners', () => {
    it('should notify state listeners on action changes', () => {
      const listener = vi.fn();
      bridge.onStateChange(listener);

      const action = createMockAction();
      bridge.registerAction('test', action);

      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(expect.any(Map));
    });
  });

  describe('getStateSummary', () => {
    it('should return summary of all actions', () => {
      const action = createMockAction('ready');
      bridge.registerAction('test', action);

      const summary = bridge.getStateSummary();

      expect(summary.test).toEqual({
        status: 'ready',
        isLoading: false,
        hasError: false,
      });
    });
  });

  describe('clearEvents', () => {
    it('should clear all events', () => {
      const action = createMockAction();
      bridge.registerAction('test', action);

      expect(bridge.getEvents().length).toBeGreaterThan(0);

      bridge.clearEvents();

      expect(bridge.getEvents().length).toBe(0);
    });
  });

  describe('maxEvents limit', () => {
    it('should respect maxEvents config', () => {
      const limitedBridge = new DevToolsBridge({ maxEvents: 3 });
      const action = createMockAction();

      limitedBridge.registerAction('test', action);
      action.emit('status-change', '1');
      action.emit('status-change', '2');
      action.emit('status-change', '3');
      action.emit('status-change', '4');

      // Should only keep last 3 events
      expect(limitedBridge.getEvents().length).toBe(3);
    });
  });

  describe('destroy', () => {
    it('should clean up everything', () => {
      const action = createMockAction();
      bridge.registerAction('test', action);

      bridge.destroy();

      expect(bridge.getActions().size).toBe(0);
    });
  });
});

describe('getDevToolsBridge singleton', () => {
  beforeEach(() => {
    resetDevToolsBridge();
  });

  it('should return same instance', () => {
    const bridge1 = getDevToolsBridge();
    const bridge2 = getDevToolsBridge();

    expect(bridge1).toBe(bridge2);
  });

  it('should reset singleton', () => {
    const bridge1 = getDevToolsBridge();
    resetDevToolsBridge();
    const bridge2 = getDevToolsBridge();

    expect(bridge1).not.toBe(bridge2);
  });
});
