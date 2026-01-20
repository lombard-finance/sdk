/**
 * DevToolsBridge - Connects SDK actions to DevTools automatically
 *
 * This is the core integration layer that makes DevTools "just work"
 * with the Lombard SDK. It automatically subscribes to action events
 * and provides the collected data to DevTools components.
 *
 * ## How It Works
 *
 * 1. Wrap the SDK at initialization
 * 2. Automatically intercept action creation
 * 3. Subscribe to all action events
 * 4. Aggregate events/state for DevTools display
 *
 * @module sdk-devtools/bridge
 */

import {
  type ApiRequestEvent,
  type ApiResponseEvent,
  DEFAULT_DEVTOOLS_CONFIG,
  type DevToolsConfig,
  type DevToolsEvent,
  type HttpMethod,
  type MonitorableAction,
  type NetworkLogEntry,
  type RegisteredAction,
} from '../types';

// ─────────────────────────────────────────────────────────────────
// Event Callback Types
// ─────────────────────────────────────────────────────────────────

export type DevToolsEventCallback = (event: DevToolsEvent) => void;
export type DevToolsStateCallback = (actions: Map<string, RegisteredAction>) => void;

// ─────────────────────────────────────────────────────────────────
// DevToolsBridge Class
// ─────────────────────────────────────────────────────────────────

/**
 * DevToolsBridge - Collects events from all SDK actions
 *
 * Usage:
 * ```typescript
 * // Create bridge
 * const bridge = new DevToolsBridge();
 *
 * // Register an action
 * const stake = sdk.btc.stake({ ... });
 * bridge.registerAction('btc-stake', stake);
 *
 * // Subscribe to events
 * const unsubscribe = bridge.onEvent((event) => {
 *   console.log('SDK Event:', event);
 * });
 *
 * // Get all events
 * const events = bridge.getEvents();
 *
 * // Get registered actions
 * const actions = bridge.getActions();
 * ```
 */
export class DevToolsBridge {
  private events: DevToolsEvent[] = [];
  private actions: Map<string, RegisteredAction> = new Map();
  private unsubscribers: Map<string, Array<() => void>> = new Map();
  private eventListeners: Set<DevToolsEventCallback> = new Set();
  private stateListeners: Set<DevToolsStateCallback> = new Set();
  private config: Required<DevToolsConfig>;
  private eventIdCounter = 0;

  // Network logging
  private networkLog: Map<string, NetworkLogEntry> = new Map();
  private networkListeners: Set<(entries: NetworkLogEntry[]) => void> = new Set();
  private requestIdCounter = 0;

  constructor(config?: DevToolsConfig) {
    this.config = { ...DEFAULT_DEVTOOLS_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────
  // Action Registration
  // ─────────────────────────────────────────────────────────────────

  /**
   * Register an SDK action for monitoring
   *
   * Automatically subscribes to all standard events:
   * - status-change
   * - error
   * - completed
   * - failed
   * - loading
   * - progress
   */
  registerAction(
    name: string,
    action: MonitorableAction,
    options?: { category?: string },
  ): () => void {
    // Store the action
    this.actions.set(name, {
      name,
      action,
      registeredAt: Date.now(),
      category: options?.category,
    });

    // Subscribe to standard SDK events
    const eventTypes = [
      'status-change',
      'error',
      'completed',
      'failed',
      'loading',
      'progress',
    ];

    const unsubscribers: Array<() => void> = [];

    for (const eventType of eventTypes) {
      try {
        const unsubscribe = action.on(eventType, (...args: unknown[]) => {
          this.handleEvent(name, eventType, args[0]);
        });
        if (typeof unsubscribe === 'function') {
          unsubscribers.push(unsubscribe);
        }
      } catch {
        // Some events might not be supported - that's ok
      }
    }

    this.unsubscribers.set(name, unsubscribers);
    this.notifyStateListeners();

    // Log registration
    this.handleEvent(name, 'registered', { status: action.status });

    // Return unregister function
    return () => { this.unregisterAction(name); };
  }

  /**
   * Unregister an action
   */
  unregisterAction(name: string): void {
    // Unsubscribe from events
    const unsubs = this.unsubscribers.get(name);
    if (unsubs) {
      unsubs.forEach(unsub => { unsub(); });
      this.unsubscribers.delete(name);
    }

    // Remove action
    this.actions.delete(name);
    this.notifyStateListeners();

    // Log unregistration
    this.handleEvent(name, 'unregistered', null);
  }

  // ─────────────────────────────────────────────────────────────────
  // Event Handling
  // ─────────────────────────────────────────────────────────────────

  private handleEvent(source: string, type: string, data: unknown): void {
    const event: DevToolsEvent = {
      id: `${++this.eventIdCounter}`,
      type,
      timestamp: Date.now(),
      data,
      source,
      isSDKEvent: true,
    };

    // Add to events array (with max limit)
    this.events.push(event);
    if (this.events.length > this.config.maxEvents) {
      this.events.shift();
    }

    // Console logging if enabled
    if (this.config.consoleLogging) {
      console.log(`[DevTools] ${source} → ${type}:`, data);
    }

    // Notify listeners
    this.notifyEventListeners(event);
  }

  private notifyEventListeners(event: DevToolsEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('[DevTools] Event listener error:', err);
      }
    });
  }

  private notifyStateListeners(): void {
    this.stateListeners.forEach(listener => {
      try {
        listener(new Map(this.actions));
      } catch (err) {
        console.error('[DevTools] State listener error:', err);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Subscriptions
  // ─────────────────────────────────────────────────────────────────

  /**
   * Subscribe to new events
   */
  onEvent(callback: DevToolsEventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /**
   * Subscribe to action state changes
   */
  onStateChange(callback: DevToolsStateCallback): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  // ─────────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────────

  /**
   * Get all collected events
   */
  getEvents(): DevToolsEvent[] {
    return [...this.events];
  }

  /**
   * Get all registered actions
   */
  getActions(): Map<string, RegisteredAction> {
    return new Map(this.actions);
  }

  /**
   * Get current state summary for all actions
   */
  getStateSummary(): Record<string, { status: string; isLoading: boolean; hasError: boolean }> {
    const summary: Record<string, { status: string; isLoading: boolean; hasError: boolean }> = {};

    this.actions.forEach((reg, name) => {
      summary[name] = {
        status: reg.action.status,
        isLoading: reg.action.isLoading,
        hasError: reg.action.isFailed,
      };
    });

    return summary;
  }

  // ─────────────────────────────────────────────────────────────────
  // Network Logging (API Requests/Responses)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Log an API request
   *
   * Call this when an HTTP request is initiated.
   * Returns a request ID to correlate with the response.
   */
  logApiRequest(params: {
    method: HttpMethod;
    url: string;
    payload?: unknown;
    headers?: Record<string, string>;
    source?: string;
  }): string {
    const requestId = `req-${++this.requestIdCounter}`;

    const request: ApiRequestEvent = {
      id: requestId,
      type: 'api-request',
      method: params.method,
      url: params.url,
      payload: params.payload,
      headers: params.headers,
      timestamp: Date.now(),
      source: params.source,
    };

    const entry: NetworkLogEntry = {
      request,
      response: null,
      isPending: true,
      isFailed: false,
    };

    this.networkLog.set(requestId, entry);

    // Also log as a regular event for the Events tab
    this.handleEvent(params.source || 'api', 'api-request', {
      method: params.method,
      url: params.url,
      payload: params.payload,
    });

    // Console logging if enabled
    if (this.config.consoleLogging) {
      console.log(`[DevTools] API ${params.method} ${params.url}`, params.payload);
    }

    this.notifyNetworkListeners();

    return requestId;
  }

  /**
   * Log an API response
   *
   * Call this when an HTTP response is received.
   * Pass the requestId returned from logApiRequest.
   */
  logApiResponse(params: {
    requestId: string;
    status: number;
    statusText?: string;
    data?: unknown;
    error?: string;
  }): void {
    const entry = this.networkLog.get(params.requestId);
    if (!entry) {
      console.warn(`[DevTools] No request found for ID: ${params.requestId}`);
      return;
    }

    const response: ApiResponseEvent = {
      id: `res-${params.requestId}`,
      type: 'api-response',
      requestId: params.requestId,
      status: params.status,
      statusText: params.statusText,
      data: params.data,
      error: params.error,
      duration: Date.now() - entry.request.timestamp,
      timestamp: Date.now(),
    };

    entry.response = response;
    entry.isPending = false;
    entry.isFailed = params.status >= 400 || !!params.error;

    // Also log as a regular event
    this.handleEvent(entry.request.source || 'api', 'api-response', {
      status: params.status,
      duration: response.duration,
      url: entry.request.url,
      error: params.error,
    });

    // Console logging if enabled
    if (this.config.consoleLogging) {
      const logFn = entry.isFailed ? console.error : console.log;
      logFn(
        `[DevTools] API Response ${params.status} (${response.duration}ms) ${entry.request.url}`,
        params.data || params.error,
      );
    }

    this.notifyNetworkListeners();
  }

  /**
   * Subscribe to network log changes
   */
  onNetworkChange(callback: (entries: NetworkLogEntry[]) => void): () => void {
    this.networkListeners.add(callback);
    return () => this.networkListeners.delete(callback);
  }

  /**
   * Get all network log entries
   */
  getNetworkLog(): NetworkLogEntry[] {
    return Array.from(this.networkLog.values()).sort(
      (a, b) => b.request.timestamp - a.request.timestamp,
    );
  }

  /**
   * Clear network log
   */
  clearNetworkLog(): void {
    this.networkLog.clear();
    this.notifyNetworkListeners();
  }

  private notifyNetworkListeners(): void {
    const entries = this.getNetworkLog();
    this.networkListeners.forEach(listener => {
      try {
        listener(entries);
      } catch (err) {
        console.error('[DevTools] Network listener error:', err);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Clear all registered actions
   */
  clearActions(): void {
    this.actions.forEach((_, name) => { this.unregisterAction(name); });
  }

  /**
   * Destroy the bridge
   */
  destroy(): void {
    this.clearActions();
    this.clearNetworkLog();
    this.eventListeners.clear();
    this.stateListeners.clear();
    this.networkListeners.clear();
  }
}

// ─────────────────────────────────────────────────────────────────
// Singleton Instance (optional convenience)
// ─────────────────────────────────────────────────────────────────

let globalBridge: DevToolsBridge | null = null;

/**
 * Get or create the global DevTools bridge
 */
export function getDevToolsBridge(config?: DevToolsConfig): DevToolsBridge {
  if (!globalBridge) {
    globalBridge = new DevToolsBridge(config);
  }
  return globalBridge;
}

/**
 * Reset the global DevTools bridge
 */
export function resetDevToolsBridge(): void {
  if (globalBridge) {
    globalBridge.destroy();
    globalBridge = null;
  }
}

