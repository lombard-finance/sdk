/**
 * Hook Tests
 *
 * Tests for DevTools React hooks.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetDevToolsBridge } from '../bridge/DevToolsBridge';
import { useActionEvents } from '../hooks/useDevTools';
import {
  DevToolsProvider,
  useDevToolsContext,
  useRegisterAction,
} from '../provider/DevToolsProvider';
import type { MonitorableAction } from '../types';

// Mock action factory
function createMockAction(initialStatus = 'idle'): MonitorableAction & {
  emit: (event: string, data: unknown) => void;
  handlers: Map<string, Array<(...args: unknown[]) => void>>;
} {
  const handlers = new Map<string, Array<(...args: unknown[]) => void>>();
  let currentStatus = initialStatus;
  let currentLoading = false;
  let currentError: Error | null = null;

  return {
    get status() {
      return currentStatus;
    },
    get isLoading() {
      return currentLoading;
    },
    get error() {
      return currentError;
    },
    get isFailed() {
      return currentError !== null;
    },
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
      if (event === 'status-change') {
        currentStatus = String(data);
      } else if (event === 'loading') {
        currentLoading = Boolean(data);
      } else if (event === 'error') {
        currentError = data as Error;
      }

      const eventHandlers = handlers.get(event);
      if (eventHandlers) {
        eventHandlers.forEach((h) => {
          h(data);
        });
      }
    },
  };
}

// Provider wrapper
const createWrapper = (enabled = true) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DevToolsProvider enabled={enabled}>{children}</DevToolsProvider>;
  };
};

describe('useDevToolsContext', () => {
  beforeEach(() => {
    resetDevToolsBridge();
  });

  it('should throw outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useDevToolsContext());
    }).toThrow('useDevToolsContext must be used within a DevToolsProvider');

    consoleSpy.mockRestore();
  });

  it('should provide context values', () => {
    const { result } = renderHook(() => useDevToolsContext(), {
      wrapper: createWrapper(),
    });

    expect(result.current.events).toEqual([]);
    expect(result.current.actions).toBeInstanceOf(Map);
    expect(typeof result.current.registerAction).toBe('function');
    expect(typeof result.current.clearEvents).toBe('function');
    expect(result.current.isEnabled).toBe(true);
  });

  it('should register and track actions', () => {
    const { result } = renderHook(() => useDevToolsContext(), {
      wrapper: createWrapper(),
    });

    const action = createMockAction();

    act(() => {
      result.current.registerAction('test', action);
    });

    expect(result.current.actions.has('test')).toBe(true);
    expect(result.current.events.some((e) => e.type === 'registered')).toBe(
      true,
    );
  });

  it('should track action events', async () => {
    const { result } = renderHook(() => useDevToolsContext(), {
      wrapper: createWrapper(),
    });

    const action = createMockAction();

    act(() => {
      result.current.registerAction('test', action);
    });

    act(() => {
      action.emit('status-change', 'new-status');
    });

    await waitFor(() => {
      expect(
        result.current.events.some((e) => e.type === 'status-change'),
      ).toBe(true);
    });
  });

  it('should clear events', () => {
    const { result } = renderHook(() => useDevToolsContext(), {
      wrapper: createWrapper(),
    });

    const action = createMockAction();

    act(() => {
      result.current.registerAction('test', action);
    });

    expect(result.current.events.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.events.length).toBe(0);
  });
});

describe('useRegisterAction', () => {
  beforeEach(() => {
    resetDevToolsBridge();
  });

  it('should handle null action without error', () => {
    // Should not throw when action is null
    expect(() => {
      renderHook(
        () => {
          useRegisterAction('test', null);
        },
        { wrapper: createWrapper() },
      );
    }).not.toThrow();
  });

  it('should not throw on unmount', () => {
    const action = createMockAction();

    const { unmount } = renderHook(
      () => {
        useRegisterAction('test', action);
      },
      { wrapper: createWrapper() },
    );

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });
});

describe('useActionEvents', () => {
  it('should return initial state when action is null', () => {
    const { result } = renderHook(() => useActionEvents(null));

    expect(result.current.status).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.events).toEqual([]);
  });

  it('should track status changes', async () => {
    const action = createMockAction('initial');
    const { result } = renderHook(() => useActionEvents(action));

    expect(result.current.status).toBe('initial');

    act(() => {
      action.emit('status-change', 'updated');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('updated');
      expect(
        result.current.events.some((e) => e.type === 'status-change'),
      ).toBe(true);
    });
  });

  it('should track loading state', async () => {
    const action = createMockAction();
    const { result } = renderHook(() => useActionEvents(action));

    expect(result.current.isLoading).toBe(false);

    act(() => {
      action.emit('loading', true);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });
  });

  it('should clear events', async () => {
    const action = createMockAction();
    const { result } = renderHook(() => useActionEvents(action));

    act(() => {
      action.emit('status-change', 'test');
    });

    await waitFor(() => {
      expect(result.current.events.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.events.length).toBe(0);
  });
});
