/**
 * Tests for event type definitions
 *
 * These tests verify the structure of event types and event maps.
 */

import { describe, expect, it } from 'vitest';

import type { StrategyProgress } from '../../core/types';
import { ErrorCode, LombardError } from '../errors';
import { ActionEvent, type ActionEventMap } from '../events';

describe('Event Types', () => {
  describe('ActionEvent Enum', () => {
    it('should define all deposit events', () => {
      expect(ActionEvent.Progress).toBe('progress');
      expect(ActionEvent.StatusChange).toBe('status-change');
      expect(ActionEvent.Completed).toBe('completed');
      expect(ActionEvent.Failed).toBe('failed');
      expect(ActionEvent.Error).toBe('error');
    });
  });

  describe('ActionEvent Enum', () => {
    it('should define all redeem events', () => {
      expect(ActionEvent.Progress).toBe('progress');
      expect(ActionEvent.StatusChange).toBe('status-change');
      expect(ActionEvent.Completed).toBe('completed');
      expect(ActionEvent.Failed).toBe('failed');
      expect(ActionEvent.Error).toBe('error');
    });
  });

  describe('ActionEvent Enum', () => {
    it('should define all unstake events', () => {
      expect(ActionEvent.Progress).toBe('progress');
      expect(ActionEvent.StatusChange).toBe('status-change');
      expect(ActionEvent.Completed).toBe('completed');
      expect(ActionEvent.Failed).toBe('failed');
      expect(ActionEvent.Error).toBe('error');
    });
  });

  describe('ActionEvent Enum', () => {
    it('should define all deploy events', () => {
      expect(ActionEvent.Progress).toBe('progress');
      expect(ActionEvent.StatusChange).toBe('status-change');
      expect(ActionEvent.Completed).toBe('completed');
      expect(ActionEvent.Failed).toBe('failed');
      expect(ActionEvent.Error).toBe('error');
    });
  });

  describe('ActionEvent Enum', () => {
    it('should define all bridge events', () => {
      expect(ActionEvent.Progress).toBe('progress');
      expect(ActionEvent.StatusChange).toBe('status-change');
      expect(ActionEvent.Completed).toBe('completed');
      expect(ActionEvent.Failed).toBe('failed');
      expect(ActionEvent.Error).toBe('error');
    });
  });

  describe('ActionEventMap Type', () => {
    it('should map events to their handler types', () => {
      const progressHandler: ActionEventMap[typeof ActionEvent.Progress] = (
        progress: StrategyProgress<string>,
      ) => {
        expect(progress).toBeDefined();
      };

      const statusHandler: ActionEventMap[typeof ActionEvent.StatusChange] = (
        status: string,
      ) => {
        expect(typeof status).toBe('string');
      };

      const completedHandler: ActionEventMap[typeof ActionEvent.Completed] =
        () => {
          // No params
        };

      const errorHandler: ActionEventMap[typeof ActionEvent.Error] = (
        error: LombardError,
      ) => {
        expect(error).toBeDefined();
      };

      // Call handlers to verify they work
      progressHandler({ status: 'executing', steps: {} });
      statusHandler('ready');
      completedHandler();
      // A real instance rather than a structural copy: the copy had to be kept
      // in step with the class by hand, and fell behind the moment the class
      // gained a method.
      errorHandler(new LombardError(ErrorCode.UNKNOWN_ERROR, 'Test'));
    });
  });
});
