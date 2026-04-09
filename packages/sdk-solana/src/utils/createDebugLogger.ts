/**
 * Options for creating a debug logger.
 */
export interface CreateDebugLoggerOptions {
  /**
   * Whether debugging is enabled. If false, the logger will do nothing.
   * @default false
   */
  debug?: boolean;
  /**
   * An optional prefix to prepend to every log message (e.g., '[MyModule]').
   * @default ''
   */
  prefix?: string;
}

/**
 * Creates a debug logging function that conditionally logs to the console.
 *
 * @param options Configuration options for the logger.
 * @returns A logging function `debugLog(...args: unknown[]) => void`.
 *          This function will only print to the console if `options.debug` was true.
 */
export function createDebugLogger(options: CreateDebugLoggerOptions = {}) {
  const { debug = false, prefix = "" } = options;
  const logs: string[] = [];

  // Return the actual logger function
  const debugLog = (...args: unknown[]): void => {
    // Only proceed if debugging is enabled
    if (!debug) {
      return;
    }

    // Format arguments: stringify objects, keep others as strings
    const formattedArgs = args.map((arg) =>
      typeof arg === "object" && arg !== null
        ? JSON.stringify(arg)
        : String(arg),
    );

    // Construct the final log message with optional prefix
    const logMessage = prefix
      ? `${prefix} ${formattedArgs.join(" ")}`
      : formattedArgs.join(" ");

    // Log to the console
    console.log(logMessage);
  };

  const printLogs = (): void => {
    console.log(logs.join("\n"));
  };

  return { debugLog, printLogs };
}

/**
 * Type alias for the returned debug logging function.
 */
export type DebugLog = ReturnType<typeof createDebugLogger>;
