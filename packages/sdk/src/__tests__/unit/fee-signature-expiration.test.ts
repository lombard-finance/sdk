/**
 * Fee Signature Expiration Tests
 *
 * Verifies that Unix timestamp expiration dates are correctly parsed
 * when checking if a stored fee signature is still valid.
 */

import { describe, expect, it } from 'vitest';

describe('Fee Signature Expiration Parsing', () => {
  /**
   * Helper to check if a signature is expired
   * This mirrors the logic in stake/config/evm.ts and deposit/config/evm.ts
   */
  function isSignatureExpired(expirationDate: string | undefined): boolean {
    if (!expirationDate) return false;
    // expirationDate is a Unix timestamp in seconds, convert to milliseconds
    return new Date(Number(expirationDate) * 1000) < new Date();
  }

  describe('Unix timestamp parsing', () => {
    it('should correctly identify a future timestamp as NOT expired', () => {
      const futureTimestamp = String(Math.floor(Date.now() / 1000) + 3600);
      expect(isSignatureExpired(futureTimestamp)).toBe(false);
    });

    it('should correctly identify a past timestamp as expired', () => {
      // Jan 1, 2020 00:00:00 UTC - clearly in the past
      const pastTimestamp = '1577836800';

      // Verify the timestamp represents the expected date (in UTC)
      const date = new Date(Number(pastTimestamp) * 1000);
      expect(date.getUTCFullYear()).toBe(2020);
      expect(date.getUTCMonth()).toBe(0); // January
      expect(date.getUTCDate()).toBe(1);

      // The signature SHOULD be expired
      expect(isSignatureExpired(pastTimestamp)).toBe(true);
    });

    it('should handle undefined expiration date as not expired', () => {
      expect(isSignatureExpired(undefined)).toBe(false);
    });

    it('should handle empty string as not expired', () => {
      // Number('') = 0, which converts to Jan 1, 1970 - in the past
      // But the condition checks if expirationDate exists first
      // For safety, we treat empty string as "no expiration"
      expect(isSignatureExpired('')).toBe(false);
    });
  });

  describe('Bug fix verification: Unix timestamp vs Date string parsing', () => {
    it('WRONG: new Date(string) parses incorrectly', () => {
      const timestamp = '1768491343';

      // This is the WRONG way - new Date() tries to parse as ISO string
      const wrongDate = new Date(timestamp);

      // This returns Invalid Date or a wrong date
      expect(wrongDate.toString()).toMatch(/Invalid Date|1970/);
    });

    it('CORRECT: new Date(number * 1000) parses correctly', () => {
      const timestamp = '1768491343';

      // This is the CORRECT way - convert to milliseconds
      const correctDate = new Date(Number(timestamp) * 1000);

      // This returns the correct date: Jan 15, 2026
      expect(correctDate.getFullYear()).toBe(2026);
      expect(correctDate.getMonth()).toBe(0);
      expect(correctDate.getDate()).toBe(15);
    });
  });
});
