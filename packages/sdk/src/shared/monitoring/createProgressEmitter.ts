/**
 * Progress Emitter Utility
 *
 * Creates a lightweight event emitter for progress updates.
 * Used by strategy implementations to notify listeners of state changes.
 */

export interface ProgressEmitter<T> {
  subscribe(callback: (progress: T) => void): () => void;
  emit(progress: T): void;
  clear(): void;
}

/**
 * Creates a progress emitter
 *
 * @returns ProgressEmitter instance with subscribe, emit, and clear methods
 */
export function createProgressEmitter<T>(): ProgressEmitter<T> {
  const listeners = new Set<(progress: T) => void>();

  return {
    subscribe(callback: (progress: T) => void): () => void {
      listeners.add(callback);

      // Return unsubscribe function
      return () => {
        listeners.delete(callback);
      };
    },

    emit(progress: T): void {
      for (const listener of listeners) {
        try {
          listener(progress);
        } catch (error) {
          console.error("Error in progress listener:", error);
        }
      }
    },

    clear(): void {
      listeners.clear();
    },
  };
}
