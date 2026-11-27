/**
 * useDevTools - React hook for integrating DevTools with SDK actions
 *
 * This is the main hook that developers will use to connect DevTools
 * to their SDK usage. It provides:
 * - Automatic event collection
 * - Action registration
 * - State for DevTools components
 *
 * @module sdk-devtools/hooks/useDevTools
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DevToolsBridge, getDevToolsBridge } from '../bridge/DevToolsBridge';
import type {
  DevToolsConfig,
  DevToolsEvent,
  MonitorableAction,
  RegisteredAction,
} from '../types';

// ─────────────────────────────────────────────────────────────────
// Hook Return Type
// ─────────────────────────────────────────────────────────────────

export interface UseDevToolsReturn {
  /** All collected events */
  events: DevToolsEvent[];

  /** All registered actions */
  actions: Map<string, RegisteredAction>;

  /** Current state summary */
  stateSummary: Record<
    string,
    { status: string; isLoading: boolean; hasError: boolean }
  >;

  /** Register an action for monitoring */
  registerAction: (
    name: string,
    action: MonitorableAction,
    options?: { category?: string },
  ) => () => void;

  /** Unregister an action */
  unregisterAction: (name: string) => void;

  /** Clear all events */
  clearEvents: () => void;

  /** Clear all actions */
  clearActions: () => void;

  /** The underlying bridge instance */
  bridge: DevToolsBridge;
}

// ─────────────────────────────────────────────────────────────────
// Main Hook
// ─────────────────────────────────────────────────────────────────

/**
 * React hook for DevTools integration
 *
 * @example Basic usage
 * ```tsx
 * function MyComponent() {
 *   const { events, registerAction, clearEvents } = useDevTools();
 *
 *   useEffect(() => {
 *     const stake = sdk.btc.stake({ destChain: Chain.ETHEREUM, assetOut: AssetId.LBTC });
 *     const unregister = registerAction('stake', stake);
 *
 *     return unregister;
 *   }, []);
 *
 *   return (
 *     <DevToolsPanel
 *       events={events}
 *       onClearEvents={clearEvents}
 *     />
 *   );
 * }
 * ```
 *
 * @example With useAction helper
 * ```tsx
 * function MyComponent() {
 *   const { registerAction } = useDevTools();
 *
 *   const stake = useAction(() => {
 *     const action = sdk.btc.stake({ ... });
 *     registerAction('stake', action);
 *     return action;
 *   }, []);
 *
 *   // stake is automatically monitored
 * }
 * ```
 */
export function useDevTools(config?: DevToolsConfig): UseDevToolsReturn {
  // Use global bridge or create local one
  const bridgeRef = useRef<DevToolsBridge | null>(null);

  if (!bridgeRef.current) {
    bridgeRef.current = config
      ? new DevToolsBridge(config)
      : getDevToolsBridge();
  }

  const bridge = bridgeRef.current;

  // State for React re-renders
  const [events, setEvents] = useState<DevToolsEvent[]>(() =>
    bridge.getEvents(),
  );
  const [actions, setActions] = useState<Map<string, RegisteredAction>>(() =>
    bridge.getActions(),
  );

  // Subscribe to bridge updates
  useEffect(() => {
    const unsubEvent = bridge.onEvent(() => {
      setEvents(bridge.getEvents());
    });

    const unsubState = bridge.onStateChange((newActions) => {
      setActions(newActions);
    });

    return () => {
      unsubEvent();
      unsubState();
    };
  }, [bridge]);

  // Memoized callbacks
  const registerAction = useCallback(
    (
      name: string,
      action: MonitorableAction,
      options?: { category?: string },
    ) => {
      return bridge.registerAction(name, action, options);
    },
    [bridge],
  );

  const unregisterAction = useCallback(
    (name: string) => {
      bridge.unregisterAction(name);
    },
    [bridge],
  );

  const clearEvents = useCallback(() => {
    bridge.clearEvents();
    setEvents([]);
  }, [bridge]);

  const clearActions = useCallback(() => {
    bridge.clearActions();
    setActions(new Map());
  }, [bridge]);

  // Compute state summary
  const stateSummary = useMemo(() => bridge.getStateSummary(), [actions]);

  return {
    events,
    actions,
    stateSummary,
    registerAction,
    unregisterAction,
    clearEvents,
    clearActions,
    bridge,
  };
}

// ─────────────────────────────────────────────────────────────────
// Helper Hook: useMonitoredAction
// ─────────────────────────────────────────────────────────────────

/**
 * Hook that creates an action and automatically registers it with DevTools
 *
 * @example
 * ```tsx
 * const stake = useMonitoredAction(
 *   'btc-stake',
 *   () => sdk.btc.stake({ destChain: Chain.ETHEREUM, assetOut: AssetId.LBTC }),
 *   [sdk],
 * );
 * ```
 */
export function useMonitoredAction<T extends MonitorableAction>(
  name: string,
  createAction: () => T,
  deps: React.DependencyList,
): T | null {
  const { registerAction } = useDevTools();
  const [action, setAction] = useState<T | null>(null);

  useEffect(() => {
    const newAction = createAction();
    setAction(newAction);

    const unregister = registerAction(name, newAction);

    return () => {
      unregister();
      setAction(null);
    };
  }, deps);

  return action;
}

// ─────────────────────────────────────────────────────────────────
// Helper Hook: useActionEvents
// ─────────────────────────────────────────────────────────────────

/**
 * Hook that subscribes to events from a specific action
 *
 * @example
 * ```tsx
 * const { events, status, isLoading, error } = useActionEvents(stakeAction);
 * ```
 */
export function useActionEvents(action: MonitorableAction | null) {
  const [events, setEvents] = useState<DevToolsEvent[]>([]);
  const [status, setStatus] = useState<string>(action?.status ?? 'idle');
  const [isLoading, setIsLoading] = useState(action?.isLoading ?? false);
  const [error, setError] = useState<Error | null>(action?.error ?? null);
  const eventIdRef = useRef(0);

  useEffect(() => {
    if (!action) return;

    const unsubscribers: Array<() => void> = [];

    // Status change
    unsubscribers.push(
      action.on('status-change', (newStatus: unknown) => {
        setStatus(String(newStatus));
        setEvents((prev) => [
          ...prev,
          {
            id: String(++eventIdRef.current),
            type: 'status-change',
            timestamp: Date.now(),
            data: newStatus,
            isSDKEvent: true,
          },
        ]);
      }),
    );

    // Loading
    unsubscribers.push(
      action.on('loading', (loading: unknown) => {
        setIsLoading(Boolean(loading));
        setEvents((prev) => [
          ...prev,
          {
            id: String(++eventIdRef.current),
            type: 'loading',
            timestamp: Date.now(),
            data: loading,
            isSDKEvent: true,
          },
        ]);
      }),
    );

    // Error
    unsubscribers.push(
      action.on('error', (err: unknown) => {
        setError(err as Error);
        setEvents((prev) => [
          ...prev,
          {
            id: String(++eventIdRef.current),
            type: 'error',
            timestamp: Date.now(),
            data: err,
            isSDKEvent: true,
          },
        ]);
      }),
    );

    // Completed
    unsubscribers.push(
      action.on('completed', () => {
        setEvents((prev) => [
          ...prev,
          {
            id: String(++eventIdRef.current),
            type: 'completed',
            timestamp: Date.now(),
            data: null,
            isSDKEvent: true,
          },
        ]);
      }),
    );

    // Failed
    unsubscribers.push(
      action.on('failed', () => {
        setEvents((prev) => [
          ...prev,
          {
            id: String(++eventIdRef.current),
            type: 'failed',
            timestamp: Date.now(),
            data: null,
            isSDKEvent: true,
          },
        ]);
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => {
        unsub();
      });
    };
  }, [action]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    status,
    isLoading,
    error,
    isFailed: error !== null,
    clearEvents,
  };
}
