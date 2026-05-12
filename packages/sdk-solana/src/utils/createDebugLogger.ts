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
  const { debug = false, prefix = '' } = options;
  const logs: string[] = [];

  const debugLog = (...args: unknown[]): void => {
    const formattedArgs = args.map((arg) =>
      typeof arg === 'object' && arg !== null
        ? JSON.stringify(arg)
        : String(arg),
    );

    const logMessage = prefix
      ? `${prefix} ${formattedArgs.join(' ')}`
      : formattedArgs.join(' ');

    logs.push(logMessage);

    if (debug) {
      console.log(logMessage);
    }
  };

  const printLogs = (): string => logs.join('\n');

  return { debugLog, printLogs };
}

/**
 * Type alias for the returned debug logging function.
 */
export type DebugLog = ReturnType<typeof createDebugLogger>;
