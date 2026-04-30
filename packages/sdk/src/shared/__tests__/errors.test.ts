/**
 * Tests for error handling
 *
 * Verifies LombardError class and error code enums.
 */

import { describe, expect, it } from 'vitest';

import {
  ContractErrorCode,
  ErrorCode,
  LombardError,
  ProviderErrorCode,
  RegistryErrorCode,
  ValidationErrorCode } from '../errors';

describe('LombardError', () => {
  it('should create error with code and message', () => {
    const error = new LombardError(
      ErrorCode.UNKNOWN_ERROR,
      'Something went wrong',
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(LombardError);
    expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(error.message).toBe('Something went wrong');
    expect(error.name).toBe('LombardError');
  });

  it('should accept metadata', () => {
    const error = new LombardError(
      ProviderErrorCode.PROVIDER_MISSING,
      'Provider not configured',
      {
        chain: 'ethereum',
        requiredProvider: 'evm' },
    );

    expect(error.metadata).toEqual({
      chain: 'ethereum',
      requiredProvider: 'evm' });
  });

  it('should have proper stack trace', () => {
    const error = new LombardError(ErrorCode.UNKNOWN_ERROR, 'Test error');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('LombardError');
  });

  it('should serialize to JSON with all properties', () => {
    const error = new LombardError(
      RegistryErrorCode.ROUTE_NOT_FOUND,
      'Route not found',
      {
        assetIn: 'BTC',
        assetOut: 'LBTC' },
    );

    const json = error.toJSON();
    expect(json).toMatchObject({
      code: RegistryErrorCode.ROUTE_NOT_FOUND,
      message: 'Route not found',
      metadata: {
        assetIn: 'BTC',
        assetOut: 'LBTC' } });
    // Also verify new properties exist
    expect(json.name).toBe('LombardError');
    expect(json.sdkVersion).toBeDefined();
    expect(json.timestamp).toBeDefined();
  });

  it('should include cause if provided', () => {
    const cause = new Error('Original error');
    const error = new LombardError(ErrorCode.UNKNOWN_ERROR, 'Wrapped error', {
      originalError: cause.message });

    expect(error.metadata?.originalError).toBe('Original error');
  });
});

describe('Error Code Enums', () => {
  describe('ErrorCode', () => {
    it('should define general error codes', () => {
      expect(ErrorCode.UNKNOWN_ERROR).toBe('unknown-error');
      expect(ErrorCode.INVALID_CONFIGURATION).toBe('invalid-configuration');
      expect(ErrorCode.OPERATION_TIMEOUT).toBe('operation-timeout');
      expect(ErrorCode.OPERATION_CANCELLED).toBe('operation-cancelled');
    });
  });

  describe('ProviderErrorCode', () => {
    it('should define provider error codes', () => {
      expect(ProviderErrorCode.PROVIDER_MISSING).toBe('provider-missing');
      expect(ProviderErrorCode.PROVIDER_INITIALIZATION_FAILED).toBe(
        'provider-initialization-failed',
      );
      expect(ProviderErrorCode.PROVIDER_CALL_FAILED).toBe(
        'provider-call-failed',
      );
      expect(ProviderErrorCode.SIGNER_MISSING).toBe('signer-missing');
      expect(ProviderErrorCode.USER_REJECTED).toBe('user-rejected');
    });
  });

  describe('RegistryErrorCode', () => {
    it('should define registry error codes', () => {
      expect(RegistryErrorCode.ROUTE_NOT_FOUND).toBe('route-not-found');
      expect(RegistryErrorCode.INVALID_ROUTE_DEFINITION).toBe(
        'invalid-route-definition',
      );
      expect(RegistryErrorCode.UNSUPPORTED_CHAIN).toBe('unsupported-chain');
      expect(RegistryErrorCode.UNSUPPORTED_ASSET).toBe('unsupported-asset');
      expect(RegistryErrorCode.INCOMPATIBLE_ROUTE).toBe('incompatible-route');
    });
  });

  describe('ValidationErrorCode', () => {
    it('should define validation error codes', () => {
      expect(ValidationErrorCode.INVALID_ADDRESS).toBe('invalid-address');
      expect(ValidationErrorCode.INVALID_AMOUNT).toBe('invalid-amount');
      expect(ValidationErrorCode.AMOUNT_TOO_SMALL).toBe('amount-too-small');
      expect(ValidationErrorCode.AMOUNT_TOO_LARGE).toBe('amount-too-large');
      expect(ValidationErrorCode.INSUFFICIENT_BALANCE).toBe(
        'insufficient-balance',
      );
      expect(ValidationErrorCode.INVALID_PARAMETER).toBe('invalid-parameter');
    });
  });

  describe('ContractErrorCode', () => {
    it('should define contract error codes', () => {
      expect(ContractErrorCode.CONTRACT_CALL_FAILED).toBe(
        'contract-call-failed',
      );
      expect(ContractErrorCode.TRANSACTION_FAILED).toBe('transaction-failed');
      expect(ContractErrorCode.TRANSACTION_REVERTED).toBe(
        'transaction-reverted',
      );
      expect(ContractErrorCode.APPROVAL_FAILED).toBe('approval-failed');
      expect(ContractErrorCode.INSUFFICIENT_ALLOWANCE).toBe(
        'insufficient-allowance',
      );
      expect(ContractErrorCode.GAS_ESTIMATION_FAILED).toBe(
        'gas-estimation-failed',
      );
    });
  });
});

describe('Error Factory Functions', () => {
  it('should create provider errors with factory', () => {
    const error = LombardError.providerMissing('ethereum', 'evm');

    expect(error.code).toBe(ProviderErrorCode.PROVIDER_MISSING);
    expect(error.message).toContain('ethereum');
    expect(error.metadata?.chain).toBe('ethereum');
  });

  it('should create validation errors with factory', () => {
    const error = LombardError.invalidAmount('Must be greater than 0');

    expect(error.code).toBe(ValidationErrorCode.INVALID_AMOUNT);
    expect(error.message).toBe('Must be greater than 0');
  });

  it('should create registry errors with factory', () => {
    const error = LombardError.routeNotFound({
      assetIn: 'BTC',
      assetOut: 'LBTC',
      sourceChain: 'bitcoin-mainnet',
      destChain: 'ethereum' });

    expect(error.code).toBe(RegistryErrorCode.ROUTE_NOT_FOUND);
    expect(error.metadata).toBeDefined();
  });
});
