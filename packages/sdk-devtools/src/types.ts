/**
 * SDK DevTools - Type Definitions
 *
 * Core types for the Lombard SDK DevTools package.
 * These are framework-agnostic and can be used with any UI framework.
 */

// ─────────────────────────────────────────────────────────────────
// SDK Event Types
// ─────────────────────────────────────────────────────────────────

/**
 * Represents an event emitted by the SDK
 */
export interface DevToolsEvent {
  /** Unique event ID */
  id: string;

  /** Event type (e.g., 'status-change', 'error', 'completed') */
  type: string;

  /** Unix timestamp when event occurred */
  timestamp: number;

  /** Event payload data */
  data: unknown;

  /** Source action name (e.g., 'BtcDepositLbtc', 'EvmWithdrawLbtc') */
  source?: string;

  /** Whether this event came from the SDK's built-in event emitter */
  isSDKEvent: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Reducer/State Log Types
// ─────────────────────────────────────────────────────────────────

/**
 * Log entry for reducer actions (Redux DevTools style)
 */
export interface ReducerLogEntry {
  /** Unique log ID */
  id: string;

  /** Unix timestamp when action was dispatched */
  timestamp: number;

  /** The dispatched action */
  action: {
    type: string;
    payload?: unknown;
  };

  /** State before action */
  prevState: unknown;

  /** State after action */
  nextState: unknown;
}

// ─────────────────────────────────────────────────────────────────
// Action Monitoring Types
// ─────────────────────────────────────────────────────────────────

/**
 * Minimal interface for monitorable SDK actions
 * Matches the SDK's MonitorableAction interface
 */
export interface MonitorableAction {
  /** Current status of the action */
  readonly status: string;

  /** Whether an async operation is in progress */
  readonly isLoading: boolean;

  /** Error that occurred (if any) */
  readonly error: Error | null;

  /** Whether the action has failed */
  readonly isFailed: boolean;

  /** Subscribe to events */
  on(event: string, handler: (...args: unknown[]) => void): () => void;
}

/**
 * Registered action with metadata
 */
export interface RegisteredAction {
  /** Unique name for this action instance */
  name: string;

  /** The action instance */
  action: MonitorableAction;

  /** When the action was registered */
  registeredAt: number;

  /** Category (btc, evm, solana, etc.) */
  category?: string;
}

// ─────────────────────────────────────────────────────────────────
// Flow Step Types
// ─────────────────────────────────────────────────────────────────

/**
 * Represents a step in an action flow
 */
export interface FlowStep {
  /** Step identifier */
  id: string;

  /** Display label */
  label: string;

  /** Optional description */
  description?: string;

  /** Step status */
  status: 'pending' | 'current' | 'completed' | 'error';
}

// ─────────────────────────────────────────────────────────────────
// DevTools Configuration
// ─────────────────────────────────────────────────────────────────

/**
 * Position options for the floating widget
 */
export type DevToolsPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

/**
 * Theme options for DevTools
 */
export type DevToolsTheme = 'dark' | 'light' | 'system';

/**
 * Configuration options for DevTools
 */
export interface DevToolsConfig {
  /** Widget position on screen */
  position?: DevToolsPosition;

  /** Whether to start open or collapsed */
  defaultOpen?: boolean;

  /** Theme preference */
  theme?: DevToolsTheme;

  /** Show environment indicator */
  showEnvironment?: boolean;

  /** Enable console logging alongside widget */
  consoleLogging?: boolean;

  /** Maximum number of events to retain */
  maxEvents?: number;

  /** Maximum number of reducer logs to retain */
  maxReducerLogs?: number;
}

/**
 * Default DevTools configuration
 */
export const DEFAULT_DEVTOOLS_CONFIG: Required<DevToolsConfig> = {
  position: 'bottom-right',
  defaultOpen: false,
  theme: 'dark',
  showEnvironment: true,
  consoleLogging: false,
  maxEvents: 100,
  maxReducerLogs: 50,
};

// ─────────────────────────────────────────────────────────────────
// Mock Wallet Types
// ─────────────────────────────────────────────────────────────────

/**
 * Mock addresses for testing without real wallets
 */
export interface MockAddresses {
  evm: string;
  bitcoin: string;
  solana: string;
  sui: string;
  starknet: string;
}

/**
 * Mock wallet state and controls
 */
export interface MockWalletState {
  /** Whether mock wallet is enabled */
  isEnabled: boolean;

  /** Current mock address (based on chain type) */
  address: string;

  /** Current mock chain ID */
  chainId: number;

  /** Whether mock wallet can sign (always false) */
  canSign: boolean;

  /** Enable mock wallet */
  enable: () => void;

  /** Disable mock wallet */
  disable: () => void;

  /** Toggle mock wallet */
  toggle: () => void;

  /** Set mock chain */
  setChain: (chainId: number) => void;

  /** Get mock address for a specific chain type */
  getAddress: (chainType: keyof MockAddresses) => string;
}

// ─────────────────────────────────────────────────────────────────
// Warning Types
// ─────────────────────────────────────────────────────────────────

/**
 * Warning severity levels
 */
export type WarningSeverity = 'info' | 'warning' | 'error';

/**
 * DevTools warning message
 */
export interface DevToolsWarning {
  /** Unique warning ID */
  id: string;

  /** Warning severity */
  severity: WarningSeverity;

  /** Warning title */
  title: string;

  /** Warning message */
  message: string;

  /** Link to documentation */
  docsLink?: string;

  /** Suggested code fix */
  suggestedFix?: string;

  /** When the warning was triggered */
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────
// API Request/Response Types (for Network tab)
// ─────────────────────────────────────────────────────────────────

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * API request event - logged when a request is initiated
 */
export interface ApiRequestEvent {
  /** Unique request ID */
  id: string;

  /** Event type */
  type: 'api-request';

  /** HTTP method */
  method: HttpMethod;

  /** Request URL (full or relative) */
  url: string;

  /** Request payload (body or params) */
  payload?: unknown;

  /** Request headers (selected) */
  headers?: Record<string, string>;

  /** When the request was initiated */
  timestamp: number;

  /** Source/origin of the request (e.g., 'api.deposits', 'btc.stake') */
  source?: string;
}

/**
 * API response event - logged when a response is received
 */
export interface ApiResponseEvent {
  /** Unique response ID */
  id: string;

  /** Event type */
  type: 'api-response';

  /** Corresponding request ID */
  requestId: string;

  /** HTTP status code */
  status: number;

  /** Status text (e.g., 'OK', 'Not Found') */
  statusText?: string;

  /** Response data (parsed) */
  data?: unknown;

  /** Error message if request failed */
  error?: string;

  /** Request duration in milliseconds */
  duration: number;

  /** When the response was received */
  timestamp: number;
}

/**
 * Combined API event for the Network log
 */
export interface NetworkLogEntry {
  /** Request details */
  request: ApiRequestEvent;

  /** Response details (null if pending) */
  response: ApiResponseEvent | null;

  /** Whether the request is still pending */
  isPending: boolean;

  /** Whether the request failed */
  isFailed: boolean;
}
