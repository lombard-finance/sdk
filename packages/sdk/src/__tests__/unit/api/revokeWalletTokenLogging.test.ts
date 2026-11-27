/**
 * What reaches the console when revoking a wallet JWT fails.
 *
 * The request sets `Authorization: Bearer <jwt>`, and an axios rejection
 * carries the request config it failed with. This branch runs exactly when
 * revocation did not happen, so the token is still live server-side, and a
 * consumer whose error reporter serialises error properties would take it off
 * the machine.
 */

import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { revokeWalletToken } from '../../../api-functions/walletAuth/revokeWalletToken';

vi.mock('axios');

const mockedPost = vi.mocked(axios.post);

const JWT = 'header.payload.signature-that-must-not-be-logged';

let logged: unknown[][];

beforeEach(() => {
  vi.resetAllMocks();
  logged = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    logged.push(args);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** An axios rejection shaped as one: the config it failed with, headers and all. */
function rejectionCarryingTheHeader() {
  return Object.assign(new Error('Network Error'), {
    isAxiosError: true,
    config: {
      url: 'v2/auth/token/revoke',
      headers: { Authorization: `Bearer ${JWT}` },
    },
    response: undefined,
  });
}

describe('revokeWalletToken', () => {
  it('does not put the token in the log when revocation fails', async () => {
    mockedPost.mockRejectedValue(rejectionCarryingTheHeader());

    await revokeWalletToken({ jwt: JWT, env: Env.prod });

    expect(logged).toHaveLength(1);
    const line = JSON.stringify(logged[0]);
    expect(line).not.toContain(JWT);
    expect(line).not.toContain('Bearer');
    expect(line).not.toContain('Authorization');
  });

  it('still says what went wrong', async () => {
    mockedPost.mockRejectedValue(rejectionCarryingTheHeader());

    await revokeWalletToken({ jwt: JWT, env: Env.prod });

    expect(String(logged[0][0])).toContain('Network Error');
  });

  // Logging the error object was how the header got out: everything hanging
  // off an axios error goes with it.
  it('logs a string rather than the error object', async () => {
    mockedPost.mockRejectedValue(rejectionCarryingTheHeader());

    await revokeWalletToken({ jwt: JWT, env: Env.prod });

    expect(logged[0]).toHaveLength(1);
    expect(typeof logged[0][0]).toBe('string');
  });

  it('swallows the failure, so a disconnect can still clear local state', async () => {
    mockedPost.mockRejectedValue(rejectionCarryingTheHeader());

    await expect(
      revokeWalletToken({ jwt: JWT, env: Env.prod }),
    ).resolves.toBeUndefined();
  });

  it('does nothing at all without a token', async () => {
    await revokeWalletToken({ jwt: '', env: Env.prod });

    expect(mockedPost).not.toHaveBeenCalled();
    expect(logged).toHaveLength(0);
  });
});
