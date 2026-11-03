/**
 * How fast async wallet verification polls, and what it does when it is told
 * to slow down.
 *
 * The gateway rate-limits `/v2/auth/*` per source IP, and a sign-in has spent
 * two of those requests before it polls. A fixed 2 s poll sent thirty a
 * minute, which is enough on its own to exhaust a budget that users behind one
 * address share. These pin the backoff, and that a 429 is waited out rather
 * than reported as a failed sign-in.
 */
import { Env, VERIFICATION_STATUS } from '@lombard.finance/sdk-common';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pollWalletVerification } from '../../../api-functions/walletAuth/pollWalletVerification';

type Reply =
  | { body: unknown }
  | { network: true }
  | { status: number; headers?: Record<string, string> };

const originalAdapter = axios.defaults.adapter;
const requests: InternalAxiosRequestConfig[] = [];
const replies: Reply[] = [];

const pending: Reply = { body: { status: VERIFICATION_STATUS.pending } };
const valid: Reply = {
  body: {
    status: VERIFICATION_STATUS.completeValid,
    jwt: 'token',
    expires_at: 'later',
  },
};

beforeEach(() => {
  vi.useFakeTimers();
  requests.length = 0;
  replies.length = 0;
  axios.defaults.adapter = async (config) => {
    requests.push(config);
    const reply = replies.shift() ?? pending;
    if ('network' in reply) {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    }
    if ('body' in reply) {
      return {
        data: reply.body,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }
    const response = {
      data: {},
      status: reply.status,
      statusText: '',
      headers: reply.headers ?? {},
      config,
    };
    throw new AxiosError(
      `Request failed with status code ${reply.status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      response,
    );
  };
});

afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  vi.useRealTimers();
});

function poll() {
  return pollWalletVerification({ verificationId: 'ticket', env: Env.stage });
}

describe('pollWalletVerification pacing', () => {
  it('waits before the first poll, then backs off to a 15 s interval', async () => {
    replies.push(pending, pending, pending, pending, valid);
    const result = poll();

    // Polls go out at 3, 9, 19, 34 and 49 seconds.
    const expected = [
      [2_999, 0],
      [1, 1],
      [6_000, 2],
      [10_000, 3],
      [14_999, 3],
      [1, 4],
      [15_000, 5],
    ] as const;
    for (const [advanceMs, count] of expected) {
      await vi.advanceTimersByTimeAsync(advanceMs);
      expect(requests).toHaveLength(count);
    }

    await expect(result).resolves.toEqual({ jwt: 'token', expiresAt: 'later' });
  });

  it('sends five polls in the first minute and a last one at the deadline', async () => {
    const result = poll().catch((error: Error) => error);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(requests).toHaveLength(5);

    // 64, 79, 94 and 109 s, then the wait is cut to land on 120 s.
    await vi.advanceTimersByTimeAsync(59_999);
    expect(requests).toHaveLength(9);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(10);

    await expect(result).resolves.toHaveProperty(
      'message',
      'Wallet verification timed out',
    );
    expect(requests).toHaveLength(10);
  });

  it('holds off for a readable Retry-After after a 429', async () => {
    replies.push({ status: 429, headers: { 'retry-after': '20' } }, valid);
    const result = poll();

    await vi.advanceTimersByTimeAsync(3_000);
    expect(requests).toHaveLength(1);
    // 20 s rather than the 6 s backoff step.
    await vi.advanceTimersByTimeAsync(19_999);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);

    await expect(result).resolves.toEqual({ jwt: 'token', expiresAt: 'later' });
  });

  it.each([
    ['a 429 without Retry-After', { status: 429 }],
    ['a failure with no response', { network: true }],
  ] as const)('holds off 15 s after %s', async (_name, failure) => {
    replies.push(failure as Reply, valid);
    const result = poll();

    await vi.advanceTimersByTimeAsync(3_000);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);

    await expect(result).resolves.toEqual({ jwt: 'token', expiresAt: 'later' });
  });

  it('still fails at once on any other HTTP error', async () => {
    replies.push({ status: 404 });
    const result = poll().catch((error: Error) => error);

    await vi.advanceTimersByTimeAsync(3_000);
    await expect(result).resolves.toBeInstanceOf(Error);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(requests).toHaveLength(1);
  });
});
