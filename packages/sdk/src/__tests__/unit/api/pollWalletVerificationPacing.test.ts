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
  it('backs off from 3 s to a 15 s interval', async () => {
    replies.push(pending, pending, pending, pending, pending, valid);
    const result = poll();

    // Polls go out at 0, 3, 9, 19, 34 and 49 seconds.
    const expected = [
      [0, 1],
      [2_999, 1],
      [1, 2],
      [6_000, 3],
      [10_000, 4],
      [14_999, 4],
      [1, 5],
      [15_000, 6],
    ] as const;
    for (const [advanceMs, count] of expected) {
      await vi.advanceTimersByTimeAsync(advanceMs);
      expect(requests).toHaveLength(count);
    }

    await expect(result).resolves.toEqual({ jwt: 'token', expiresAt: 'later' });
  });

  it('sends six polls in the first minute and ten over its whole budget', async () => {
    const result = poll().catch((error: Error) => error);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(requests).toHaveLength(6);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(requests).toHaveLength(10);

    // The wait after the last poll runs past the budget, then it gives up.
    await vi.advanceTimersByTimeAsync(15_000);
    expect(requests).toHaveLength(10);
    await expect(result).resolves.toHaveProperty(
      'message',
      'Wallet verification timed out',
    );
  });

  it('waits out a 429 for Retry-After and keeps polling', async () => {
    replies.push({ status: 429, headers: { 'retry-after': '20' } }, valid);
    const result = poll();

    await vi.advanceTimersByTimeAsync(0);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(19_999);
    expect(requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(requests).toHaveLength(2);

    await expect(result).resolves.toEqual({ jwt: 'token', expiresAt: 'later' });
  });

  it('still fails on any other error', async () => {
    replies.push({ status: 500 });

    await expect(poll()).rejects.toThrow();
    expect(requests).toHaveLength(1);
  });
});
