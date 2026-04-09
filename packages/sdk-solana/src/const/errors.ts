import { ErrorCode } from "../types/errors";
import { createSdkError } from "../utils/createSdkError";

// Connection errors
export const WALLET_NOT_FOUND_ERROR = createSdkError({
  code: ErrorCode.WALLET_NOT_FOUND,
  message: "Wallet provider not found. Please install the wallet extension.",
});

export const CONNECTION_REJECTED_ERROR = createSdkError({
  code: ErrorCode.CONNECTION_REJECTED,
  message: "Connection rejected by user.",
});

export const CONNECTION_TIMEOUT_ERROR = createSdkError({
  code: ErrorCode.CONNECTION_TIMEOUT,
  message: "Connection timed out. Please try again.",
});

export const ALREADY_CONNECTED_ERROR = createSdkError({
  code: ErrorCode.ALREADY_CONNECTED,
  message: "Wallet is already connected.",
});

// Transaction errors
export const TRANSACTION_FAILED_ERROR = createSdkError({
  code: ErrorCode.TRANSACTION_FAILED,
  message: "Transaction failed to execute.",
});

export const TRANSACTION_REJECTED_ERROR = createSdkError({
  code: ErrorCode.TRANSACTION_REJECTED,
  message: "Transaction rejected by user.",
});

export const INSUFFICIENT_FUNDS_ERROR = createSdkError({
  code: ErrorCode.INSUFFICIENT_FUNDS,
  message: "Insufficient funds for transaction.",
});

// Validation errors
export const INVALID_ADDRESS_ERROR = createSdkError({
  code: ErrorCode.INVALID_ADDRESS,
  message: "Invalid Solana address format.",
});

export const INVALID_AMOUNT_ERROR = createSdkError({
  code: ErrorCode.INVALID_AMOUNT,
  message: "Invalid amount. Amount must be greater than 0.",
});

export const INVALID_MESSAGE_ERROR = createSdkError({
  code: ErrorCode.INVALID_MESSAGE_ERROR,
  message: "Invalid message format.",
});

// Network errors
export const NETWORK_ERROR = createSdkError({
  code: ErrorCode.NETWORK_ERROR,
  message: "Network connection error. Please check your internet connection.",
});

export const RPC_ERROR = createSdkError({
  code: ErrorCode.RPC_ERROR,
  message: "RPC server error. Please try again later.",
});

// LBTC-specific errors
export const NO_ACCOUNT_ERROR = createSdkError({
  code: ErrorCode.NO_ACCOUNT_ERROR,
  message: "No connected account found.",
});

export const CLAIM_REJECTED_ERROR = createSdkError({
  code: ErrorCode.CLAIM_REJECTED,
  message: "LBTC claim operation was rejected.",
});

export const UNSTAKE_REJECTED_ERROR = createSdkError({
  code: ErrorCode.UNSTAKE_REJECTED,
  message: "LBTC unstake operation was rejected.",
});
