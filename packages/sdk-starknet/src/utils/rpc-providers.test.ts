/**
 * Failing over between RPC endpoints.
 *
 * One free public node with no key was a single point of failure that failed
 * misleadingly: once its quota was spent it answered JSON-RPC `-32601`, "the
 * method starknet_call does not exist/is not available", which reads as a
 * protocol problem and is a rate limit. Every public-key getter then failed and
 * the resulting error named the account — so a healthy, correctly deployed
 * account looked broken, and one QA session went into proving it was not.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StarknetChainId } from './chains';
import { getRpcProvider, setStarknetRpcEndpoints } from './rpc-providers';

const CHAIN = StarknetChainId.SN_SEPOLIA;
const A = 'https://first.example/rpc';
const B = 'https://second.example/rpc';

function ok(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** What a rate-limited node actually sends back. */
function rateLimited(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32601, message: 'the method does not exist' },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

/** The provider's fetch, reached the way starknet.js reaches it. */
async function call(): Promise<unknown> {
  const provider = getRpcProvider(CHAIN);
  return provider.getChainId();
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setStarknetRpcEndpoints(CHAIN, [A, B]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('endpoint failover', () => {
  it('uses the first endpoint that answers', async () => {
    fetchMock.mockResolvedValueOnce(ok('0x534e5f5345504f4c4941'));

    await call();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(A);
  });

  it('moves on when a node reports the method as unavailable', async () => {
    // The rate-limit signature. Treating -32601 as fatal is what turned a
    // quota into "your account has no public key".
    fetchMock
      .mockResolvedValueOnce(rateLimited())
      .mockResolvedValueOnce(ok('0x534e5f5345504f4c4941'));

    await call();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(B);
  });

  it('moves on when a node answers with a bad status', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(ok('0x534e5f5345504f4c4941'));

    await call();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('moves on when a node answers with something that is not JSON', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('<html>nope</html>', { status: 200 }))
      .mockResolvedValueOnce(ok('0x534e5f5345504f4c4941'));

    await call();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('moves on when a node throws', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(ok('0x534e5f5345504f4c4941'));

    await call();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('says how many endpoints it tried when they all fail', async () => {
    // `mockImplementation`, not `mockResolvedValue`: a Response body can be
    // read once, and deciding whether to fail over means reading it. A shared
    // instance would fail the second read for the wrong reason.
    fetchMock.mockImplementation(() => Promise.resolve(rateLimited()));

    await expect(call()).rejects.toThrow(/2 tried/);
  });

  it('refuses an empty endpoint list', () => {
    expect(() => setStarknetRpcEndpoints(CHAIN, [])).toThrow(
      /At least one RPC endpoint/,
    );
  });

  it('picks up a replaced list rather than a cached provider', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(ok('0x534e5f5345504f4c4941')),
    );
    await call();

    setStarknetRpcEndpoints(CHAIN, [B]);
    fetchMock.mockClear();
    await call();

    expect(fetchMock.mock.calls[0]?.[0]).toBe(B);
  });
});
