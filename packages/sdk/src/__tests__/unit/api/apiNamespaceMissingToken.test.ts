/**
 * The v2-to-v1 fallback, end to end through the real readers and the real
 * HTTP layer: with `apiVersion: 'v2'` and an `auth` that has no token, the
 * user-scoped request is refused before it is sent, and the namespace reads
 * the public v1 route instead. Only v1 is mocked; axios is never reached.
 */
import type { LombardAuth } from '@lombard.finance/sdk-common';
import { Env } from '@lombard.finance/sdk-common';
import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';

vi.mock(
  '../../../api-functions/getDepositsByAddress/getDepositsByAddress',
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getDepositsByAddress: vi.fn(async () => ['v1']),
  }),
);
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  const request = vi.fn(() => {
    throw new Error('nothing should be sent');
  });
  return {
    ...actual,
    default: Object.assign(request, actual.default),
  };
});

import { ApiNamespace } from '../../../client/ApiNamespace';

describe('sdk.api.deposits() with apiVersion v2 and no token', () => {
  it('reads v1 without sending the v2 request', async () => {
    const auth: LombardAuth = { getToken: async () => undefined };
    const api = new ApiNamespace(Env.stage, auth, 'v2');

    expect(
      await api.deposits('0x00000000000000000000000000000000000000aa'),
    ).toEqual(['v1']);
    expect(axios).not.toHaveBeenCalled();
  });
});
