/**
 * Strongly-typed event emitter factory
 *
 * Creates lightweight event emitters with full TypeScript type safety.
 * Unlike EventEmitter3, this implementation:
 * - Is specifically tailored for strategy events
 * - Has minimal overhead
 * - Provides perfect type inference
 * - Handles errors gracefully
 */

/**
 * Event handler function type
 */
export type EventHandler<TArgs extends unknown[] = unknown[]> = (
  ...args: TArgs
) => void;

/**
 * Event emitter interface
 */
export interface EventEmitter<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event emitter requires bivariant `any` for generic event handler constraint
  TEventMap extends Record<string, EventHandler<any>>,
> {
  /**
   * Register an event handler
   *
   * @param event - Event name
   * @param handler - Handler function
   * @returns Unsubscribe function
   */
  on<TEvent extends keyof TEventMap>(
    event: TEvent,
    handler: TEventMap[TEvent],
  ): () => void;

  /**
   * Emit an event to all registered handlers
   *
   * @param event - Event name
   * @param data - Event data (if any)
   */
  emit<TEvent extends keyof TEventMap>(
    event: TEvent,
    ...args: Parameters<TEventMap[TEvent]>
  ): void;

  /**
   * Remove a specific event handler
   *
   * @param event - Event name
   * @param handler - Handler function to remove
   */
  off<TEvent extends keyof TEventMap>(
    event: TEvent,
    handler: TEventMap[TEvent],
  ): void;

  /**
   * Clear all event handlers
   */
  clear(): void;
}

/**
 * Create a strongly-typed event emitter
 *
 * @returns Event emitter instance
 *
 * @example
 * ```typescript
 * const emitter = createEventEmitter<ActionEventMap>();
 *
 * // Register handler
 * const unsubscribe = emitter.on(ActionEvent.Progress, (progress) => {
 *   console.log(progress.status);
 * });
 *
 * // Emit event
 * emitter.emit(ActionEvent.Progress, { status: 'ready', steps: {} });
 *
 * // Unsubscribe
 * unsubscribe();
 * ```
 */
export function createEventEmitter<
  TEventMap extends Record<string, EventHandler>,
>(): EventEmitter<TEventMap> {
  // Store handlers in a Map for efficient lookup
  const handlers = new Map<keyof TEventMap, Set<EventHandler>>();

  return {
    on<TEvent extends keyof TEventMap>(
      event: TEvent,
      handler: TEventMap[TEvent],
    ): () => void {
      // Get or create handler set for this event
      let eventHandlers = handlers.get(event);
      if (!eventHandlers) {
        eventHandlers = new Set();
        handlers.set(event, eventHandlers);
      }

      // Add handler
      eventHandlers.add(handler as EventHandler);

      // Return unsubscribe function
      return () => {
        eventHandlers?.delete(handler as EventHandler);
        // Clean up empty sets
        if (eventHandlers && eventHandlers.size === 0) {
          handlers.delete(event);
        }
      };
    },

    emit<TEvent extends keyof TEventMap>(
      event: TEvent,
      ...args: Parameters<TEventMap[TEvent]>
    ): void {
      const eventHandlers = handlers.get(event);
      if (!eventHandlers || eventHandlers.size === 0) {
        return;
      }

      // Call all handlers for this event
      // Wrap in try-catch to prevent one handler from breaking others
      for (const handler of eventHandlers) {
        try {
          handler(...args);
        } catch (error) {
          // Log error but don't throw - one handler failing shouldn't break others
          console.error(
            `Error in event handler for "${String(event)}":`,
            error,
          );
        }
      }
    },

    off<TEvent extends keyof TEventMap>(
      event: TEvent,
      handler: TEventMap[TEvent],
    ): void {
      const eventHandlers = handlers.get(event);
      if (eventHandlers) {
        eventHandlers.delete(handler as EventHandler);
        // Clean up empty sets
        if (eventHandlers.size === 0) {
          handlers.delete(event);
        }
      }
    },

    clear(): void {
      handlers.clear();
    },
  };
}
