/**
 * Tests for event type definitions
 *
 * These tests verify the structure of event types and event maps.
 */

import { describe, expect, it } from 'vitest';

import type { StrategyProgress } from '../../core/types';
import { ErrorCode, type LombardError } from '../errors';
import {
  BridgeEvent,
  DeployEvent,
  DepositEvent,
  type DepositEventMap,
  RedeemEvent,
  UnstakeEvent,
} from '../events';

describe('Event Types', () => {
  describe('DepositEvent Enum', () => {
    it('should define all deposit events', () => {
      expect(DepositEvent.Progress).toBe('progress');
      expect(DepositEvent.StatusChange).toBe('status-change');
      expect(DepositEvent.Completed).toBe('completed');
      expect(DepositEvent.Failed).toBe('failed');
      expect(DepositEvent.Error).toBe('error');
    });
  });

  describe('RedeemEvent Enum', () => {
    it('should define all redeem events', () => {
      expect(RedeemEvent.Progress).toBe('progress');
      expect(RedeemEvent.StatusChange).toBe('status-change');
      expect(RedeemEvent.Completed).toBe('completed');
      expect(RedeemEvent.Failed).toBe('failed');
      expect(RedeemEvent.Error).toBe('error');
    });
  });

  describe('UnstakeEvent Enum', () => {
    it('should define all unstake events', () => {
      expect(UnstakeEvent.Progress).toBe('progress');
      expect(UnstakeEvent.StatusChange).toBe('status-change');
      expect(UnstakeEvent.Completed).toBe('completed');
      expect(UnstakeEvent.Failed).toBe('failed');
      expect(UnstakeEvent.Error).toBe('error');
    });
  });

  describe('DeployEvent Enum', () => {
    it('should define all deploy events', () => {
      expect(DeployEvent.Progress).toBe('progress');
      expect(DeployEvent.StatusChange).toBe('status-change');
      expect(DeployEvent.Completed).toBe('completed');
      expect(DeployEvent.Failed).toBe('failed');
      expect(DeployEvent.Error).toBe('error');
    });
  });

  describe('BridgeEvent Enum', () => {
    it('should define all bridge events', () => {
      expect(BridgeEvent.Progress).toBe('progress');
      expect(BridgeEvent.StatusChange).toBe('status-change');
      expect(BridgeEvent.Completed).toBe('completed');
      expect(BridgeEvent.Failed).toBe('failed');
      expect(BridgeEvent.Error).toBe('error');
    });
  });

  describe('DepositEventMap Type', () => {
    it('should map events to their handler types', () => {
      const progressHandler: DepositEventMap[typeof DepositEvent.Progress] = (
        progress: StrategyProgress<string>,
      ) => {
        expect(progress).toBeDefined();
      };

      const statusHandler: DepositEventMap[typeof DepositEvent.StatusChange] = (
        status: string,
      ) => {
        expect(typeof status).toBe('string');
      };

      const completedHandler: DepositEventMap[typeof DepositEvent.Completed] =
        () => {
          // No params
        };

      const errorHandler: DepositEventMap[typeof DepositEvent.Error] = (
        error: LombardError,
      ) => {
        expect(error).toBeDefined();
      };

      // Call handlers to verify they work
      progressHandler({ status: 'executing', steps: {} });
      statusHandler('ready');
      completedHandler();
      errorHandler({
        code: ErrorCode.UNKNOWN_ERROR,
        message: 'Test',
        name: 'LombardError',
        sdkVersion: '3.8.0',
        timestamp: new Date().toISOString(),
        toJSON: () => ({
          code: ErrorCode.UNKNOWN_ERROR,
          message: 'Test',
          name: 'LombardError',
        }),
        toSentryContext: () => ({
          errorCode: ErrorCode.UNKNOWN_ERROR,
          errorMessage: 'Test',
          sdkVersion: '3.8.0',
          timestamp: new Date().toISOString(),
        }),
      } as LombardError);
    });
  });
});
