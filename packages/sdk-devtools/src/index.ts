/**
 * @lombard.finance/sdk-devtools
 *
 * Developer tools for the Lombard SDK.
 * Provides debugging, inspection, and testing utilities.
 *
 * ## Quick Start
 *
 * ```tsx
 * import {
 *   DevToolsProvider,
 *   DevToolsPanel,
 *   useDevToolsContext,
 * } from '@lombard.finance/sdk-devtools';
 *
 * // 1. Wrap your app
 * function App() {
 *   return (
 *     <DevToolsProvider>
 *       <MyApp />
 *     </DevToolsProvider>
 *   );
 * }
 *
 * // 2. Register actions
 * function StakeComponent() {
 *   const { registerAction } = useDevToolsContext();
 *
 *   useEffect(() => {
 *     const action = sdk.btc.stake({ ... });
 *     return registerAction('stake', action);
 *   }, []);
 * }
 *
 * // 3. Display DevTools
 * function DebugView() {
 *   const { events, clearEvents } = useDevToolsContext();
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
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type {
  ApiRequestEvent,
  ApiResponseEvent,
  // Configuration
  DevToolsConfig,
  // Event types
  DevToolsEvent,
  DevToolsPosition,
  DevToolsTheme,
  // Warnings
  DevToolsWarning,
  // Flow types
  FlowStep,
  // Network logging (API requests/responses)
  HttpMethod,
  // Mock wallet
  MockAddresses,
  MockWalletState,
  // Action monitoring
  MonitorableAction,
  NetworkLogEntry,
  ReducerLogEntry,
  RegisteredAction,
  WarningSeverity,
} from "./types";
export { DEFAULT_DEVTOOLS_CONFIG } from "./types";

// ─────────────────────────────────────────────────────────────────
// Provider (Recommended for React apps)
// ─────────────────────────────────────────────────────────────────

export {
  DevToolsProvider,
  type DevToolsProviderProps,
  useDevToolsContext,
  useRegisterAction,
} from "./provider";

// ─────────────────────────────────────────────────────────────────
// Bridge (For non-React or custom integrations)
// ─────────────────────────────────────────────────────────────────

export {
  DevToolsBridge,
  type DevToolsEventCallback,
  type DevToolsStateCallback,
  getDevToolsBridge,
  resetDevToolsBridge,
} from "./bridge";

// ─────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────

export {
  // Utilities
  createSteps,
  // Main panel
  DevToolsPanel,
  type DevToolsPanelProps,
  // Individual components
  EventLog,
  type EventLogProps,
  NetworkLog,
  ReducerLog,
  type ReducerLogProps,
  StateInspector,
  type StateInspectorProps,
  StatusBadge,
  type StatusBadgeProps,
  StepIndicator,
  type StepIndicatorProps,
} from "./components";

// ─────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────

export {
  getMockAddress,
  MOCK_ADDRESSES,
  MOCK_WALLET_LIMITATIONS,
  requiresRealWallet,
  useActionEvents,
  // DevTools hooks
  useDevTools,
  type UseDevToolsReturn,
  // Mock wallet
  useMockWallet,
  useMonitoredAction,
} from "./hooks";
