/**
 * Console Logger Factory
 *
 * Creates a logger that outputs to the console with configurable log levels.
 * Used when `debug: true` is set in SDK configuration.
 *
 * @module utils/consoleLogger
 */

import type { Logger } from "../shared/context/types";

/**
 * Log level hierarchy (from most to least verbose)
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

/**
 * Options for creating a console logger
 */
export interface ConsoleLoggerOptions {
  /**
   * Minimum log level to output
   *
   * - 'debug': All logs (most verbose)
   * - 'info': Info, warnings, and errors
   * - 'warn': Warnings and errors only
   * - 'error': Errors only
   * - 'none': No logs (silent)
   *
   * @default 'debug'
   */
  level?: LogLevel;

  /**
   * Prefix for all log messages
   *
   * @default '[Lombard SDK]'
   */
  prefix?: string;

  /**
   * Include timestamp in log messages
   *
   * @default false
   */
  timestamp?: boolean;
}

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error", "none"];

/**
 * Create a console logger with configurable options
 *
 * @param options - Logger configuration options
 * @returns Logger instance that outputs to console
 *
 * @example
 * ```typescript
 * // Basic usage - log everything
 * const logger = createConsoleLogger();
 *
 * // Only warnings and errors
 * const logger = createConsoleLogger({ level: 'warn' });
 *
 * // Custom prefix with timestamp
 * const logger = createConsoleLogger({
 *   prefix: '[MyApp SDK]',
 *   timestamp: true,
 * });
 * ```
 */
export function createConsoleLogger(
  options: ConsoleLoggerOptions = {},
): Logger {
  const {
    level = "debug",
    prefix = "[Lombard SDK]",
    timestamp = false,
  } = options;

  const minLevelIndex = LOG_LEVELS.indexOf(level);

  const shouldLog = (logLevel: LogLevel): boolean => {
    const levelIndex = LOG_LEVELS.indexOf(logLevel);
    return levelIndex >= minLevelIndex && level !== "none";
  };

  const formatMessage = (msg: string): string => {
    if (timestamp) {
      const ts = new Date().toISOString();
      return `${prefix} ${ts} ${msg}`;
    }
    return `${prefix} ${msg}`;
  };

  const formatMeta = (meta?: Record<string, unknown>): unknown[] => {
    if (!meta || Object.keys(meta).length === 0) {
      return [];
    }
    return [meta];
  };

  return {
    debug(message: string, meta?: Record<string, unknown>): void {
      if (shouldLog("debug")) {
        console.debug(formatMessage(message), ...formatMeta(meta));
      }
    },

    info(message: string, meta?: Record<string, unknown>): void {
      if (shouldLog("info")) {
        console.info(formatMessage(message), ...formatMeta(meta));
      }
    },

    warn(message: string, meta?: Record<string, unknown>): void {
      if (shouldLog("warn")) {
        console.warn(formatMessage(message), ...formatMeta(meta));
      }
    },

    error(message: string, meta?: Record<string, unknown>): void {
      if (shouldLog("error")) {
        console.error(formatMessage(message), ...formatMeta(meta));
      }
    },
  };
}

/**
 * Create a silent logger (no-op)
 *
 * Useful for testing or when you want to suppress all logs.
 */
export function createSilentLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}
