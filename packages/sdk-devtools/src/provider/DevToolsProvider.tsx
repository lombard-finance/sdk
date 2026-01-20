/**
 * DevToolsProvider - React Context Provider for DevTools
 *
 * Provides DevTools functionality throughout your app via React Context.
 * This is the recommended way to integrate DevTools in larger applications.
 *
 * @module sdk-devtools/provider
 */

import { createContext, type ReactNode,useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DevToolsBridge } from '../bridge/DevToolsBridge';
import type {
  DevToolsConfig,
  DevToolsEvent,
  MonitorableAction,
  NetworkLogEntry,
  RegisteredAction,
} from '../types';

// ─────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────

interface DevToolsContextValue {
  /** All collected events */
  events: DevToolsEvent[];

  /** All registered actions */
  actions: Map<string, RegisteredAction>;

  /** Network log entries (API requests/responses) */
  networkLog: NetworkLogEntry[];

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

  /** Clear network log */
  clearNetworkLog: () => void;

  /** Get current state of all actions */
  getStateSummary: () => Record<
    string,
    { status: string; isLoading: boolean; hasError: boolean }
  >;

  /** The underlying bridge instance */
  bridge: DevToolsBridge;

  /** Whether DevTools is enabled */
  isEnabled: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────

const DevToolsContext = createContext<DevToolsContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────
// Provider Props
// ─────────────────────────────────────────────────────────────────

export interface DevToolsProviderProps {
  children: ReactNode;

  /** DevTools configuration */
  config?: DevToolsConfig;

  /**
   * Whether DevTools is enabled.
   * 
   * Default: `process.env.NODE_ENV !== 'production'`
   * 
   * For development/testing tools (like sdk-demo), you may want to always
   * enable DevTools with `enabled={true}` regardless of environment, so
   * developers can debug production SDK endpoints.
   */
  enabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Provider Component
// ─────────────────────────────────────────────────────────────────

/**
 * DevTools Provider
 *
 * Wrap your app with this provider to enable DevTools functionality.
 * 
 * The `enabled` prop defaults to `false` in production (NODE_ENV === 'production')
 * as a safety net. However, you can explicitly override this:
 * - `enabled={true}` - Always enable (useful for dev tools testing prod SDK)
 * - `enabled={false}` - Always disable
 *
 * @example
 * ```tsx
 * // Basic usage - auto-disabled in production builds
 * function App() {
 *   return (
 *     <DevToolsProvider>
 *       <MyApp />
 *     </DevToolsProvider>
 *   );
 * }
 * 
 * // Always enable (for developer tools/playgrounds)
 * function DevToolApp() {
 *   return (
 *     <DevToolsProvider enabled={true}>
 *       <MyApp />
 *     </DevToolsProvider>
 *   );
 * }
 * ```
 */
export function DevToolsProvider({
  children,
  config,
  enabled = process.env.NODE_ENV !== 'production',
}: DevToolsProviderProps) {
  // Create bridge as state to ensure proper lifecycle with React StrictMode
  const [bridge] = useState(() => new DevToolsBridge(config));

  // State for React re-renders
  const [events, setEvents] = useState<DevToolsEvent[]>([]);
  const [actions, setActions] = useState<Map<string, RegisteredAction>>(new Map());
  const [networkLog, setNetworkLog] = useState<NetworkLogEntry[]>([]);
  
  // Counter to force effect re-run after mount
  const [mountId, setMountId] = useState(0);
  
  // Increment mount counter on mount to ensure subscription runs
  useEffect(() => {
    setMountId(prev => prev + 1);
  }, []);

  // Subscribe to bridge updates
  useEffect(() => {
    if (!enabled || mountId === 0) return;

    console.log('[DevToolsProvider] Setting up event subscriptions, mountId:', mountId);

    // IMPORTANT: Sync existing events immediately on subscription setup
    // This catches any events that were captured before the subscription was ready
    // (e.g., during React StrictMode's double-mount, or if action was registered early)
    const existingEvents = bridge.getEvents();
    const existingActions = bridge.getActions();
    
    if (existingEvents.length > 0) {
      console.log('[DevToolsProvider] Syncing existing events:', existingEvents.length);
      setEvents(existingEvents);
    }
    
    if (existingActions.size > 0) {
      console.log('[DevToolsProvider] Syncing existing actions:', existingActions.size);
      setActions(existingActions);
    }

    // Subscribe to new events going forward
    const unsubEvent = bridge.onEvent((event) => {
      console.log('[DevToolsProvider] Event received:', event);
      const newEvents = bridge.getEvents();
      console.log('[DevToolsProvider] Setting events:', newEvents.length);
      setEvents(newEvents);
    });

    const unsubState = bridge.onStateChange(newActions => {
      console.log('[DevToolsProvider] State changed:', newActions.size, 'actions');
      setActions(newActions);
    });

    // Subscribe to network log changes
    const unsubNetwork = bridge.onNetworkChange(entries => {
      console.log('[DevToolsProvider] Network log updated:', entries.length, 'entries');
      setNetworkLog(entries);
    });

    // Sync existing network log
    const existingNetworkLog = bridge.getNetworkLog();
    if (existingNetworkLog.length > 0) {
      console.log('[DevToolsProvider] Syncing existing network log:', existingNetworkLog.length);
      setNetworkLog(existingNetworkLog);
    }

    return () => {
      console.log('[DevToolsProvider] Cleaning up subscriptions');
      unsubEvent();
      unsubState();
      unsubNetwork();
    };
  }, [enabled, bridge, mountId]);
  
  // Cleanup bridge on unmount only
  useEffect(() => {
    return () => {
      console.log('[DevToolsProvider] Destroying bridge');
      bridge.destroy();
    };
  }, [bridge]);

  // Callbacks
  const registerAction = useCallback(
    (
      name: string,
      action: MonitorableAction,
      options?: { category?: string },
    ) => {
      if (!enabled) return () => {};
      return bridge.registerAction(name, action, options);
    },
    [bridge, enabled],
  );

  const unregisterAction = useCallback(
    (name: string) => {
      if (!enabled) return;
      bridge.unregisterAction(name);
    },
    [bridge, enabled],
  );

  const clearEvents = useCallback(() => {
    bridge.clearEvents();
    setEvents([]);
  }, [bridge]);

  const clearNetworkLog = useCallback(() => {
    bridge.clearNetworkLog();
    setNetworkLog([]);
  }, [bridge]);

  const getStateSummary = useCallback(() => {
    return bridge.getStateSummary();
  }, [bridge]);

  // Context value
  const value = useMemo(
    (): DevToolsContextValue => ({
      events,
      actions,
      networkLog,
      registerAction,
      unregisterAction,
      clearEvents,
      clearNetworkLog,
      getStateSummary,
      bridge,
      isEnabled: enabled,
    }),
    [
      events,
      actions,
      networkLog,
      registerAction,
      unregisterAction,
      clearEvents,
      clearNetworkLog,
      getStateSummary,
      bridge,
      enabled,
    ],
  );

  return (
    <DevToolsContext.Provider value={value}>
      {children}
    </DevToolsContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────
// Hook to use context
// ─────────────────────────────────────────────────────────────────

/**
 * Hook to access DevTools context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { registerAction, events } = useDevToolsContext();
 *
 *   useEffect(() => {
 *     const action = sdk.btc.stake({ ... });
 *     return registerAction('stake', action);
 *   }, []);
 *
 *   return <div>Events: {events.length}</div>;
 * }
 * ```
 */
export function useDevToolsContext(): DevToolsContextValue {
  const context = useContext(DevToolsContext);

  if (!context) {
    throw new Error(
      'useDevToolsContext must be used within a DevToolsProvider',
    );
  }

  return context;
}

/**
 * Hook to register an action with DevTools (from within context)
 *
 * @example
 * ```tsx
 * function StakeComponent() {
 *   const stake = useMemo(() => sdk.btc.stake({ ... }), []);
 *   useRegisterAction('stake', stake);
 *
 *   return <button onClick={() => stake.prepare({ ... })}>Stake</button>;
 * }
 * ```
 */
export function useRegisterAction(
  name: string,
  action: MonitorableAction | null,
  category?: string,
): void {
  const { registerAction } = useDevToolsContext();

  // Use refs to avoid re-registration on every render
  // We only want to re-register when name or action actually changes
  useEffect(() => {
    if (!action) return;
    return registerAction(name, action, category ? { category } : undefined);
     
  }, [name, action, registerAction]);
}

