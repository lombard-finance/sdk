/**
 * SDK Error interface
 */
export interface SdkError {
  /**
   * Error code
   */
  code: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Optional original error
   */
  originalError?: unknown;

  /**
   * Optional additional data
   */
  data?: unknown;
}

/**
 * Error codes for SDK errors
 */
export enum ErrorCode {
  // Connection errors
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  CONNECTION_REJECTED = 'CONNECTION_REJECTED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  ALREADY_CONNECTED = 'ALREADY_CONNECTED',
  NO_ACCOUNT_ERROR = 'NO_ACCOUNT_ERROR',

  // Transaction errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  SIGNING_REJECTED = 'SIGNING_REJECTED',
  CLAIM_REJECTED = 'CLAIM_REJECTED',
  DEPOSIT_REJECTED = 'DEPOSIT_REJECTED',
  UNSTAKE_REJECTED = 'UNSTAKE_REJECTED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  RPC_ERROR = 'RPC_ERROR',

  // Validation errors
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_PARAMS = 'INVALID_PARAMS',
  INVALID_MESSAGE_ERROR = 'INVALID_MESSAGE_ERROR',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
