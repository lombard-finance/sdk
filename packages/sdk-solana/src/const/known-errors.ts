import { ErrorCode, SolanaSdkError } from '../utils';

// Validation errors
export const INVALID_ADDRESS_ERROR = SolanaSdkError.create({
  code: ErrorCode.INVALID_ADDRESS,
  message: 'Invalid Solana address format.',
});
