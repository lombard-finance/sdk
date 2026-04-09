/**
 * Base Action Class
 *
 * Abstract base class for all action implementations.
 * Provides:
 * - Event emission capabilities
 * - Status and error tracking (separated concerns)
 * - Type-safe event handlers
 * - Error handling utilities
 *
 * ## Error Design
 *
 * Status and error are orthogonal concerns:
 * - `status` = "What step are you at?" (IDLE, PREPARING, READY, etc.)
 * - `error` = "Did something go wrong?" (Error | null)
 * - `isFailed` = Derived from `error !== null`
 *
 * When an error occurs:
 * 1. Status stays at the step where error occurred (preserves context)
 * 2. Error is stored and accessible via `error` property
 * 3. `isFailed` returns true
 * 4. Events are emitted for listeners
 *
 * This allows easy retry - just call the method again since status
 * is already at the correct step.
 *
 * @module shared/actions/BaseAction
 */

import type { StrategyProgress } from "../../core/types";
import type { Logger } from "../context/types";
import { LombardError, ValidationErrorCode, wrapError } from "../errors";
import {
  createEventEmitter,
  type EventEmitter,
  type EventHandler,
} from "../monitoring/createEventEmitter";

/**
 * Log metadata for structured logging
 */
export interface LogMeta {
  /** Action name (e.g., 'BtcStake', 'EvmUnstake') */
  action?: string;
  /** Current step (e.g., 'prepare', 'authorize', 'execute') */
  step?: string;
  /** Current status */
  status?: string;
  /** Operation duration in milliseconds */
  duration?: number;
  /** Error code if applicable */
  errorCode?: string;
  /** Chain identifier */
  chain?: string;
  /** Any additional context */
  [key: string]: unknown;
}

/**
 * Monitorable action interface
 *
 * All actions expose this interface for consistent progress tracking.
 *
 * ## Orthogonal Concerns
 * - `status` - Which step in the flow (IDLE, NEEDS_AUTH, READY, etc.)
 * - `isLoading` - Is an async operation in progress
 * - `error` / `isFailed` - Did an error occur
 */
export interface MonitorableAction {
  /** Current status of the action (step in the flow) */
  readonly status: string;

  /** Whether an async operation is in progress */
  readonly isLoading: boolean;

  /** Error that occurred (if any) - null means no error */
  readonly error: LombardError | null;

  /** Whether the action has failed (derived from error !== null) */
  readonly isFailed: boolean;

  /**
   * Register an event handler
   *
   * @param event - Event to listen for
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  on<TEvent extends string>(
    event: TEvent,
    handler: (...args: unknown[]) => void,
  ): () => void;
}

/**
 * Base action abstract class
 *
 * Provides event emission and error handling infrastructure for all actions.
 *
 * ## Error Handling Design
 *
 * Status and error are separate concerns:
 * - On error, status stays at current step (so you know WHERE it failed)
 * - Error is stored and `isFailed` returns true
 * - Retry by calling the same method again
 *
 * @example
 * ```typescript
 * class MyAction extends BaseAction<MyEventMap, MyStatus> {
 *   async execute() {
 *     this.assertStatus('idle', 'execute');
 *     return this.act(
 *       async () => {
 *         // ... do work ...
 *         // isLoading is true during execution
 *         this.emitCompleted();
 *       },
 *       'completed', // Success status
 *     );
 *   }
 * }
 * ```
 */
export abstract class BaseAction<
  TEventMap extends Record<string, EventHandler<unknown[]>>,
  TStatus extends string,
> implements MonitorableAction {
  /** Event emitter for this action */
  protected readonly eventEmitter: EventEmitter<TEventMap>;

  /** Current status (step in the flow) */
  private _status: TStatus;

  /** Tracked error - null means no error */
  protected _error: LombardError | null = null;

  /** Loading state - true when an async operation is in progress */
  private _isLoading: boolean = false;

  /** Optional logger for debugging and monitoring */
  protected readonly logger?: Logger;

  /** Operation timing for performance monitoring */
  private _timing: Map<string, number> = new Map();

  constructor(initialStatus: TStatus, logger?: Logger) {
    this.eventEmitter = createEventEmitter<TEventMap>();
    this._status = initialStatus;
    this.logger = logger;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Logging
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Log a message with context
   *
   * Automatically includes action name and current status.
   * No-op if logger is not configured.
   *
   * Uses explicit switch to avoid dynamic property access (security best practice).
   */
  protected log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    meta?: LogMeta,
  ): void {
    if (!this.logger) return;

    const enrichedMeta: LogMeta = {
      action: this.constructor.name,
      status: this._status,
      ...meta,
    };

    // Explicit method calls to avoid unsafe-dynamic-method security warning
    switch (level) {
      case "debug":
        this.logger.debug(message, enrichedMeta);
        break;
      case "info":
        this.logger.info(message, enrichedMeta);
        break;
      case "warn":
        this.logger.warn(message, enrichedMeta);
        break;
      case "error":
        this.logger.error(message, enrichedMeta);
        break;
    }
  }

  /**
   * Get timing for an operation
   */
  public getTiming(operation: string): number | undefined {
    return this._timing.get(operation);
  }

  /**
   * Get all operation timings
   */
  public getAllTimings(): Record<string, number> {
    return Object.fromEntries(this._timing);
  }

  /**
   * Record timing for an operation
   */
  protected recordTiming(operation: string, duration: number): void {
    this._timing.set(operation, duration);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Getters
  // ─────────────────────────────────────────────────────────────────────────

  /** Current action status (which step in the flow) */
  get status(): TStatus {
    return this._status;
  }

  /** Error that occurred (if any) - null means no error */
  get error(): LombardError | null {
    return this._error;
  }

  /** Whether the action has failed (derived from error !== null) */
  get isFailed(): boolean {
    return this._error !== null;
  }

  /** Whether an async operation is in progress */
  get isLoading(): boolean {
    return this._isLoading;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Update the action status and emit status-change event
   */
  protected updateStatus(status: TStatus): void {
    this._status = status;
    this.emitStatusChange(status);
  }

  /**
   * Assert the action is in an expected status
   *
   * @param expected - Single status or array of allowed statuses
   * @param action - Name of the action being performed (for error message)
   * @throws LombardError if current status is not in expected list
   */
  protected assertStatus(expected: TStatus | TStatus[], action: string): void {
    const allowed = Array.isArray(expected) ? expected : [expected];
    if (!allowed.includes(this._status)) {
      throw new LombardError(
        ValidationErrorCode.INVALID_STATE,
        `Cannot ${action} while status is ${this._status}, allowed: ${allowed.join(", ")}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Clear any previous error
   *
   * Call this at the start of retry attempts to reset error state.
   */
  protected clearError(): void {
    this._error = null;
  }

  /**
   * Handle action failure
   *
   * Stores error, emits events, and throws.
   * Status is NOT changed - it stays at the step where the error occurred.
   * This allows callers to know exactly where the failure happened.
   *
   * @param error - The error that occurred
   * @throws The wrapped LombardError
   */
  protected handleFailure(error: unknown): never {
    this._error = error instanceof LombardError ? error : wrapError(error);
    this.emitError(this._error);
    this.emitFailed();
    throw this._error;
  }

  /**
   * Set loading state and emit event
   */
  protected setLoading(loading: boolean): void {
    this._isLoading = loading;
    this.emitLoading(loading);
  }

  /**
   * Perform an async operation with automatic state management
   *
   * This is the primary method for wrapping async operations in actions.
   * Handles loading state, errors, and status transitions automatically.
   *
   * ## Automatic Behaviors
   *
   * - **isLoading**: Set to true before operation, false after (success or failure)
   * - **error**: Cleared on start, set on failure
   * - **status**: Optionally transitions to `successStatus` on success
   *
   * ## Design Philosophy: Orthogonal Concerns
   *
   * Status, loading, and error are independent:
   * - `status` = "What step are you at?" (IDLE, NEEDS_AUTH, READY, etc.)
   * - `isLoading` = "Is an operation in progress?" (true/false)
   * - `error` = "Did something go wrong?" (Error | null)
   *
   * No transitional statuses (PREPARING, AUTHORIZING, etc.) needed!
   * The UI can derive the display state:
   * - IDLE + isLoading → "Preparing..."
   * - NEEDS_AUTH + isLoading → "Authorizing..."
   * - READY + isLoading → "Generating..."
   *
   * @param fn - Async function to execute
   * @param successStatus - Status to transition to on success (optional)
   * @returns Result of the operation
   *
   * @example Simple operation (no status change)
   * ```typescript
   * async execute() {
   *   return this.act(async () => {
   *     return this.depositAddress;
   *   });
   * }
   * ```
   *
   * @example Operation with status transition
   * ```typescript
   * async authorize(): Promise<void> {
   *   this.assertStatus([Status.NEEDS_AUTH, Status.READY], 'authorize');
   *   if (this.status === Status.READY) return;
   *
   *   return this.act(
   *     async () => {
   *       const result = await this.signTransaction();
   *       this.authState.signature = result.signature;
   *     },
   *     Status.READY
   *   );
   * }
   * ```
   *
   * @example Flow visualization
   * ```
   * Success flow:
   *   status: NEEDS_AUTH          -> NEEDS_AUTH          -> READY
   *   isLoading: false -> true                   -> false
   *
   * Failure flow:
   *   status: NEEDS_AUTH          -> NEEDS_AUTH (unchanged!)
   *   isLoading: false -> true    -> false
   *   error: null                 -> "User rejected"
   * ```
   */
  protected async act<T>(
    fn: () => Promise<T>,
    successStatus?: TStatus,
  ): Promise<T> {
    const startTime = performance.now();
    const operationName = successStatus ?? "operation";

    this.log("debug", `Starting ${operationName}`, {
      step: String(operationName),
    });
    this.clearError();
    this.setLoading(true);

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.recordTiming(String(operationName), duration);
      this.log("info", `Completed ${operationName}`, {
        step: String(operationName),
        duration: Math.round(duration),
      });

      if (successStatus !== undefined) {
        this.updateStatus(successStatus);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const lombError =
        error instanceof LombardError ? error : wrapError(error);

      this.recordTiming(String(operationName), duration);
      this.log("error", `Failed ${operationName}`, {
        step: String(operationName),
        duration: Math.round(duration),
        errorCode: lombError.code,
        errorMessage: lombError.message,
      });

      return this.handleFailure(error);
    } finally {
      this.setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Register an event handler
   *
   * @param event - Event to listen for
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  on<TEvent extends keyof TEventMap>(
    event: TEvent,
    handler: TEventMap[TEvent],
  ): () => void {
    return this.eventEmitter.on(event, handler);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Emission
  // ─────────────────────────────────────────────────────────────────────────

  /** Emit a progress update */
  protected emitProgress(progress: StrategyProgress<TStatus>): void {
    (
      this.eventEmitter as unknown as EventEmitter<
        Record<"progress", EventHandler<[StrategyProgress<TStatus>]>>
      >
    ).emit("progress", progress);
  }

  /** Emit a status change */
  protected emitStatusChange(status: TStatus): void {
    (
      this.eventEmitter as unknown as EventEmitter<
        Record<"status-change", EventHandler<[TStatus]>>
      >
    ).emit("status-change", status);
  }

  /** Emit completion event */
  protected emitCompleted(): void {
    (
      this.eventEmitter as unknown as EventEmitter<
        Record<"completed", EventHandler<[]>>
      >
    ).emit("completed");
  }

  /** Emit failed event */
  protected emitFailed(): void {
    (
      this.eventEmitter as unknown as EventEmitter<
        Record<"failed", EventHandler<[]>>
      >
    ).emit("failed");
  }

  /** Emit error event */
  protected emitError(error: LombardError): void {
    (
      this.eventEmitter as unknown as EventEmitter<
        Record<"error", EventHandler<[LombardError]>>
      >
    ).emit("error", error);
  }

  /** Emit loading state change */
  protected emitLoading(isLoading: boolean): void {
    (
      this.eventEmitter as unknown as EventEmitter<
        Record<"loading", EventHandler<[boolean]>>
      >
    ).emit("loading", isLoading);
  }

  /** Clear all event listeners */
  protected clearListeners(): void {
    this.eventEmitter.clear();
  }
}
