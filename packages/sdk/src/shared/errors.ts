/**
 * Error handling for the Lombard SDK
 *
 * This module defines a comprehensive error system with:
 * - Type-safe error codes
 * - Rich metadata support
 * - Factory methods for common errors
 * - JSON serialization for logging
 * - SDK version for debugging
 * - Sentry-compatible context extraction
 */

import { SDK_VERSION } from '../version';

/**
 * General error codes
 */
export enum ErrorCode {
  UNKNOWN_ERROR = 'unknown-error',
  INVALID_CONFIGURATION = 'invalid-configuration',
  OPERATION_TIMEOUT = 'operation-timeout',
  OPERATION_CANCELLED = 'operation-cancelled',
}

/**
 * Provider-related error codes
 */
export enum ProviderErrorCode {
  PROVIDER_MISSING = 'provider-missing',
  PROVIDER_INITIALIZATION_FAILED = 'provider-initialization-failed',
  PROVIDER_CALL_FAILED = 'provider-call-failed',
  SIGNER_MISSING = 'signer-missing',
  USER_REJECTED = 'user-rejected',
  NETWORK_MISMATCH = 'network-mismatch',
}

/**
 * Registry-related error codes
 */
export enum RegistryErrorCode {
  ROUTE_NOT_FOUND = 'route-not-found',
  INVALID_ROUTE_DEFINITION = 'invalid-route-definition',
  UNSUPPORTED_CHAIN = 'unsupported-chain',
  UNSUPPORTED_ASSET = 'unsupported-asset',
  INCOMPATIBLE_ROUTE = 'incompatible-route',
  ENVIRONMENT_MISMATCH = 'environment-mismatch',
}

/**
 * Validation error codes
 */
export enum ValidationErrorCode {
  INVALID_ADDRESS = 'invalid-address',
  INVALID_AMOUNT = 'invalid-amount',
  AMOUNT_TOO_SMALL = 'amount-too-small',
  AMOUNT_TOO_LARGE = 'amount-too-large',
  INSUFFICIENT_BALANCE = 'insufficient-balance',
  INVALID_PARAMETER = 'invalid-parameter',
  MISSING_REQUIRED_PARAMETER = 'missing-required-parameter',
  INVALID_CHAIN = 'invalid-chain',
  INVALID_STATE = 'invalid-state',
  INVALID_ASSET = 'invalid-asset',
}

/**
 * Contract interaction error codes
 */
export enum ContractErrorCode {
  CONTRACT_CALL_FAILED = 'contract-call-failed',
  TRANSACTION_FAILED = 'transaction-failed',
  TRANSACTION_REVERTED = 'transaction-reverted',
  APPROVAL_FAILED = 'approval-failed',
  INSUFFICIENT_ALLOWANCE = 'insufficient-allowance',
  GAS_ESTIMATION_FAILED = 'gas-estimation-failed',
}

/**
 * Union type of all error codes
 */
export type AnyErrorCode =
  | ErrorCode
  | ProviderErrorCode
  | RegistryErrorCode
  | ValidationErrorCode
  | ContractErrorCode;

/**
 * Lombard SDK Error class
 *
 * Custom error class that extends Error with additional properties:
 * - Machine-readable error code
 * - Rich metadata for debugging
 * - JSON serialization support
 *
 * @example
 * ```typescript
 * throw new LombardError(
 *   ProviderErrorCode.PROVIDER_MISSING,
 *   'EVM provider not configured',
 *   { chain: 'ethereum', requiredProvider: 'evm' }
 * );
 * ```
 */
export class LombardError extends Error {
  /** Machine-readable error code */
  public readonly code: AnyErrorCode;

  /** Additional metadata for debugging */
  public readonly metadata?: Record<string, unknown>;

  /** SDK version when error occurred (for debugging) */
  public readonly sdkVersion: string = SDK_VERSION;

  /** Timestamp when error occurred */
  public readonly timestamp: string = new Date().toISOString();

  constructor(
    code: AnyErrorCode,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LombardError';
    this.code = code;
    this.metadata = metadata;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LombardError);
    }
  }

  /**
   * Serialize error to JSON for logging
   *
   * Includes all context needed for debugging: code, message, metadata,
   * SDK version, timestamp, and stack trace.
   *
   * @example
   * ```typescript
   * try {
   *   await action.execute();
   * } catch (error) {
   *   if (error instanceof LombardError) {
   *     console.log(JSON.stringify(error.toJSON(), null, 2));
   *   }
   * }
   * ```
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      sdkVersion: this.sdkVersion,
      timestamp: this.timestamp,
      ...(this.metadata && { metadata: this.metadata }),
      ...(this.stack && { stack: this.stack }),
    };
  }

  /**
   * Get Sentry-compatible context for error reporting
   *
   * Returns an object suitable for Sentry's `extra` or `contexts` fields.
   *
   * @example
   * ```typescript
   * try {
   *   await action.execute();
   * } catch (error) {
   *   if (error instanceof LombardError) {
   *     Sentry.captureException(error, {
   *       contexts: { lombard: error.toSentryContext() },
   *     });
   *   }
   * }
   * ```
   */
  toSentryContext(): Record<string, unknown> {
    return {
      'sdk.version': this.sdkVersion,
      'error.code': this.code,
      'error.timestamp': this.timestamp,
      ...this.metadata,
    };
  }

  /**
   * Factory: Invalid configuration error
   */
  static invalidConfiguration(message: string): LombardError {
    return new LombardError(ErrorCode.INVALID_CONFIGURATION, message);
  }

  /**
   * Factory: Provider missing error
   */
  static providerMissing(chain: string, providerType: string): LombardError {
    return new LombardError(
      ProviderErrorCode.PROVIDER_MISSING,
      `${providerType} provider not configured for chain ${chain}. Please provide a provider via SDK initialization.`,
      { chain, providerType },
    );
  }

  static moduleMissing(moduleId: string): LombardError {
    return new LombardError(
      ValidationErrorCode.INVALID_PARAMETER,
      `Module "${moduleId}" is not registered. Install and register the corresponding package via createConfig({ modules: [...] }).`,
      { moduleId },
    );
  }

  /**
   * Factory: Provider call failed error
   */
  static providerCallFailed(
    method: string,
    cause: Error | string,
  ): LombardError {
    const causeMessage = cause instanceof Error ? cause.message : cause;
    return new LombardError(
      ProviderErrorCode.PROVIDER_CALL_FAILED,
      `Provider method ${method} failed: ${causeMessage}`,
      { method, cause: causeMessage },
    );
  }

  /**
   * Factory: User rejected transaction
   */
  static userRejected(operation: string): LombardError {
    return new LombardError(
      ProviderErrorCode.USER_REJECTED,
      `User rejected ${operation}. Please try again and approve the transaction in your wallet.`,
      { operation },
    );
  }

  /**
   * Factory: Route not found in registry
   */
  static routeNotFound(params: Record<string, unknown>): LombardError {
    return new LombardError(
      RegistryErrorCode.ROUTE_NOT_FOUND,
      'No route found matching the provided parameters. Please verify the asset and chain combination is supported.',
      params,
    );
  }

  /**
   * Factory: Invalid route definition
   */
  static invalidRouteDefinition(reason: string): LombardError {
    return new LombardError(
      RegistryErrorCode.INVALID_ROUTE_DEFINITION,
      `Invalid route definition: ${reason}`,
      { reason },
    );
  }

  /**
   * Factory: Unsupported chain
   */
  static unsupportedChain(chain: string): LombardError {
    return new LombardError(
      RegistryErrorCode.UNSUPPORTED_CHAIN,
      `Chain ${chain} is not supported in the current environment.`,
      { chain },
    );
  }

  /**
   * Factory: Invalid parameter
   */
  static invalidParameter(parameter: string, reason: string): LombardError {
    return new LombardError(ValidationErrorCode.INVALID_PARAMETER, reason, {
      parameter,
    });
  }

  /**
   * Factory: Invalid address
   */
  static invalidAddress(address: string, chain?: string): LombardError {
    return new LombardError(
      ValidationErrorCode.INVALID_ADDRESS,
      `Invalid address format: ${address}${chain ? ` for chain ${chain}` : ''}`,
      { address, chain },
    );
  }

  /**
   * Factory: Invalid amount
   */
  static invalidAmount(reason: string): LombardError {
    return new LombardError(ValidationErrorCode.INVALID_AMOUNT, reason, {
      reason,
    });
  }

  /**
   * Factory: Amount too small
   */
  static amountTooSmall(
    amount: string,
    minimum: string,
    asset: string,
  ): LombardError {
    return new LombardError(
      ValidationErrorCode.AMOUNT_TOO_SMALL,
      `Amount ${amount} is below minimum ${minimum} ${asset}`,
      { amount, minimum, asset },
    );
  }

  /**
   * Factory: Insufficient balance
   */
  static insufficientBalance(
    required: string,
    available: string,
    asset: string,
  ): LombardError {
    return new LombardError(
      ValidationErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient ${asset} balance. Required: ${required}, Available: ${available}`,
      { required, available, asset },
    );
  }

  /**
   * Factory: Missing required parameter
   */
  static missingParameter(parameterName: string): LombardError {
    return new LombardError(
      ValidationErrorCode.MISSING_REQUIRED_PARAMETER,
      `Required parameter "${parameterName}" is missing`,
      { parameterName },
    );
  }

  /**
   * Factory: Transaction failed
   */
  static transactionFailed(txHash: string, reason: string): LombardError {
    return new LombardError(
      ContractErrorCode.TRANSACTION_FAILED,
      `Transaction failed: ${reason}`,
      { txHash, reason },
    );
  }

  /**
   * Factory: Transaction reverted
   */
  static transactionReverted(
    txHash: string,
    revertReason?: string,
  ): LombardError {
    return new LombardError(
      ContractErrorCode.TRANSACTION_REVERTED,
      `Transaction reverted${revertReason ? `: ${revertReason}` : ''}`,
      { txHash, revertReason },
    );
  }

  /**
   * Factory: Approval failed
   */
  static approvalFailed(token: string, spender: string): LombardError {
    return new LombardError(
      ContractErrorCode.APPROVAL_FAILED,
      `Failed to approve ${token} for spender ${spender}`,
      { token, spender },
    );
  }
}

/**
 * Type guard to check if an error is a LombardError
 */
export function isLombardError(error: unknown): error is LombardError {
  return error instanceof LombardError;
}

/**
 * Helper to wrap unknown errors as LombardError
 */
export function wrapError(error: unknown): LombardError {
  if (isLombardError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new LombardError(ErrorCode.UNKNOWN_ERROR, error.message, {
      originalError: error.stack,
    });
  }

  return new LombardError(ErrorCode.UNKNOWN_ERROR, String(error), {
    originalValue: error,
  });
}
