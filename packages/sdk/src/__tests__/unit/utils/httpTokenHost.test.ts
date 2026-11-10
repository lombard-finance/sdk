/**
 * Where a wallet token may go, and what a failed request carries back out.
 *
 * The token is the user's session with the API gateway. `httpRequest` is the
 * one place it is attached, so the rule lives there: it goes to a gateway
 * host over https or not at all. And axios hangs the request config, headers
 * included, on every rejection, so an error rethrown as it came would hand
 * the token to whatever logs, stores or reports it.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosFn = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({ default: axiosFn, isAxiosError: () => false }));

import { getApiConfig } from '../../../common/api-config';
import { ErrorCode } from '../../../shared/errors';
import { httpPost, httpRequest } from '../../../utils/http';

const TOKEN = 'header.payload.signature';
const getToken = vi.fn(async () => TOKEN);
const auth = { getToken };

function sentAuthorization(): string | undefined {
  const config = axiosFn.mock.calls.at(-1)?.[0] as {
    headers: Record<string, string>;
  };
  return config.headers.Authorization;
}

beforeEach(() => {
  axiosFn.mockReset();
  getToken.mockClear();
  axiosFn.mockResolvedValue({ data: {}, status: 200, headers: {} });
});

describe('a wallet token goes only to an API gateway host', () => {
  const gatewayUrls = Object.values(Env).flatMap((env) => {
    const { baseApiUrl, baseApiV2Url } = getApiConfig(env);
    return [`${baseApiUrl}/api/v1/x`, `${baseApiV2Url}/v2/x`];
  });

  it.each(gatewayUrls)('is sent to %s', async (url) => {
    await httpRequest({ url, auth });

    expect(sentAuthorization()).toBe(`Bearer ${TOKEN}`);
  });

  it.each([
    ['the BFF', 'https://bff.prod.lombard-fi.com/dune-api/query/vault-tvl'],
    ['a third party', 'https://mempool.space/api/blocks/tip/height'],
    ['a gateway host over http', 'http://api.lombard.finance/v2/x'],
    ['a look-alike host', 'https://api.lombard.finance.example.com/v2/x'],
    ['a relative URL', '/v2/x'],
  ])('is not sent to %s on a public request', async (_label, url) => {
    await httpRequest({ url, auth, getAuthToken: () => TOKEN });

    expect(axiosFn).toHaveBeenCalledTimes(1);
    expect(sentAuthorization()).toBeUndefined();
    // Not even read: the host is not asked for a token it cannot use.
    expect(getToken).not.toHaveBeenCalled();
  });

  it('refuses a user-scoped request off the gateway without sending it', async () => {
    await expect(
      httpRequest({
        url: 'https://bff.prod.lombard-fi.com/sevenseas-api/deposits/x',
        scope: 'userScoped',
        auth,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_CONFIGURATION });
    expect(axiosFn).not.toHaveBeenCalled();
  });

  it.each(['Authorization', 'authorization'])(
    'refuses a caller-supplied %s header off the gateway without sending it',
    async (name) => {
      await expect(
        httpRequest({
          url: 'https://bff.prod.lombard-fi.com/x',
          headers: { [name]: `Bearer ${TOKEN}` },
        }),
      ).rejects.toMatchObject({ code: ErrorCode.INVALID_CONFIGURATION });
      expect(axiosFn).not.toHaveBeenCalled();
    },
  );

  // revokeWalletToken passes a path with no leading slash. Joined as written,
  // `https://api.lombard.finance` + `v2/...` names a different host.
  it('joins a base URL and a path the way axios does', async () => {
    await httpPost(
      'v2/auth/token/revoke',
      {},
      {
        baseURL: getApiConfig(Env.prod).baseApiV2Url,
        headers: { Authorization: `Bearer ${TOKEN}` },
      },
    );

    expect(sentAuthorization()).toBe(`Bearer ${TOKEN}`);
  });

  it('keeps a lowercase caller-supplied header as the only one', async () => {
    await httpRequest({
      url: `${getApiConfig(Env.prod).baseApiV2Url}/v2/x`,
      auth,
      headers: { authorization: 'Bearer explicit' },
    });

    const config = axiosFn.mock.calls[0][0] as {
      headers: Record<string, string>;
    };
    expect(config.headers.authorization).toBe('Bearer explicit');
    expect(config.headers.Authorization).toBeUndefined();
    expect(getToken).not.toHaveBeenCalled();
  });
});

describe('a failed request rethrows without the token', () => {
  const url = `${getApiConfig(Env.prod).baseApiV2Url}/v2/portfolio/0xabc/deposits`;

  /** A rejection shaped as axios builds one: the config it failed with. */
  function rejectionCarryingTheHeader() {
    const responseHeaders = new Map<string, string>([
      ['Authorization', `Bearer ${TOKEN}`],
    ]);
    return Object.assign(new Error('Request failed with status code 500'), {
      isAxiosError: true,
      config: { url, headers: { Authorization: `Bearer ${TOKEN}` } },
      response: {
        status: 500,
        // AxiosHeaders: deleted by name, case-insensitively.
        config: {
          headers: {
            delete: (name: string) => responseHeaders.delete(name),
            toJSON: () => Object.fromEntries(responseHeaders),
          },
        },
      },
      // Node's ClientRequest keeps the header block it sent.
      request: {
        _header: `POST /v2/x HTTP/1.1\r\nauthorization: Bearer ${TOKEN}\r\nHost: api.lombard.finance\r\n\r\n`,
      },
    });
  }

  it('strips the bearer from every place axios keeps it', async () => {
    axiosFn.mockRejectedValue(rejectionCarryingTheHeader());

    const error = await httpRequest({ url, auth, scope: 'userScoped' }).catch(
      (e: unknown) => e,
    );

    expect(JSON.stringify(error)).not.toContain(TOKEN);
    expect(
      (error as { request: { _header: string } }).request._header,
    ).not.toContain(TOKEN);
  });

  it('keeps what the caller needs to act on it', async () => {
    axiosFn.mockRejectedValue(rejectionCarryingTheHeader());

    const error = await httpRequest({ url, auth, scope: 'userScoped' }).catch(
      (e: unknown) => e,
    );

    expect(error).toMatchObject({
      message: 'Request failed with status code 500',
      response: { status: 500 },
      config: { url },
    });
  });
});
