/**
 * Unit coverage for the Sui JSON-RPC transport in `createSuiClient`.
 *
 * Fast and offline: the failover cases pin their own endpoint list and drive
 * the client through a stubbed global `fetch`. The endpoints are also probed
 * for real, but that lives in `createSuiClient.live.test.ts` so it stays out of
 * the unit run.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSuiClient,
  getDefaultSuiRpcUrls,
  resolveSuiRpcOptions,
  type SuiNetwork,
} from '../createSuiClient';

const CHAIN_IDENTIFIER = '35834a8a';
const NETWORKS: SuiNetwork[] = ['mainnet', 'testnet'];

const RPC_URLS = [
  'https://first.example/rpc',
  'https://second.example/rpc',
  'https://third.example/rpc',
];

function jsonRpcResponse(result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function unhealthyResponse(status: number): Response {
  return new Response('nope', { status });
}

/** How a node that cannot serve a method answers: HTTP 200, JSON-RPC error. */
function jsonRpcErrorResponse(code: number): Response {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code, message: 'nope' } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

/** Any JSON-RPC method works here, the transport is what is under test. */
const callChainIdentifier = (rpcUrls = RPC_URLS, timeoutMs?: number) =>
  createSuiClient('mainnet', { rpcUrls, timeoutMs }).call<string>(
    'sui_getChainIdentifier',
    [],
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getDefaultSuiRpcUrls', () => {
  it.each(NETWORKS)(
    'returns endpoints that still serve JSON-RPC on %s',
    (network) => {
      const urls = getDefaultSuiRpcUrls(network);

      expect(urls.length).toBeGreaterThan(1);

      urls.forEach((url) => {
        expect(url).toMatch(/^https:\/\//);
        // Sui Foundation fullnodes answer every JSON-RPC method with -32601.
        expect(url).not.toContain('fullnode.mainnet.sui.io');
        expect(url).not.toContain('fullnode.testnet.sui.io');
      });
    },
  );

  it('serves coin metadata on the first testnet endpoint', () => {
    // The other public testnet nodes answer suix_getCoinMetadata with null,
    // which silently degrades any caller that reads coin decimals.
    expect(getDefaultSuiRpcUrls('testnet')[0]).toContain('blockvision');
  });
});

describe('resolveSuiRpcOptions', () => {
  it('picks the endpoints for the network being called', () => {
    const options = {
      rpcUrls: {
        mainnet: ['https://mainnet.example/rpc'],
        testnet: ['https://testnet.example/rpc'],
      },
      timeoutMs: 1_000,
    };

    expect(resolveSuiRpcOptions('testnet', options)).toEqual({
      rpcUrls: ['https://testnet.example/rpc'],
      timeoutMs: 1_000,
    });
  });

  it('leaves networks without an override on the defaults', () => {
    const resolved = resolveSuiRpcOptions('testnet', {
      rpcUrls: { mainnet: ['https://mainnet.example/rpc'] },
    });

    expect(resolved.rpcUrls).toBeUndefined();
  });
});

describe('createSuiClient endpoint validation', () => {
  it.each([
    ['http://insecure.example/rpc', 'must be https'],
    ['not-a-url', 'not a valid url'],
    ['', 'not a valid url'],
  ])('rejects %s', (rpcUrl, reason) => {
    expect(() => createSuiClient('mainnet', { rpcUrls: [rpcUrl] })).toThrow(
      reason,
    );
  });

  it.each(['http://localhost:9000', 'http://127.0.0.1:9000'])(
    'allows %s so a local fullnode can be used',
    (rpcUrl) => {
      expect(() =>
        createSuiClient('mainnet', { rpcUrls: [rpcUrl] }),
      ).not.toThrow();
    },
  );

  it('keeps the query string of a valid endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await callChainIdentifier(['https://node.example/rpc?key=abc']);

    expect(fetchMock.mock.calls[0][0]).toBe('https://node.example/rpc?key=abc');
  });

  it('keeps the credentials of an authenticated endpoint', async () => {
    // Private providers hand out endpoints with basic auth in them, and an
    // anonymous request is answered with a 401 that does not fail over.
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await callChainIdentifier(['https://user:key@node.example/rpc']);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://user:key@node.example/rpc',
    );
  });
});

describe('createSuiClient', () => {
  it('sends the request to the first endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callChainIdentifier()).resolves.toBe(CHAIN_IDENTIFIER);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(RPC_URLS[0]);
  });

  it('falls back to the defaults when no endpoints are supplied', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await createSuiClient('mainnet').call('sui_getChainIdentifier', []);

    expect(fetchMock.mock.calls[0][0]).toBe(getDefaultSuiRpcUrls('mainnet')[0]);
  });

  it('falls back to the next endpoint when a node is unreachable', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callChainIdentifier()).resolves.toBe(CHAIN_IDENTIFIER);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(RPC_URLS[1]);
  });

  it.each([429, 500, 502, 503])(
    'falls back to the next endpoint on HTTP %i',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(unhealthyResponse(status))
        .mockResolvedValueOnce(jsonRpcResponse(CHAIN_IDENTIFIER));
      vi.stubGlobal('fetch', fetchMock);

      await expect(callChainIdentifier()).resolves.toBe(CHAIN_IDENTIFIER);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it('gives up on a hanging endpoint and moves to the next', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new Error('aborted')),
            );
          }),
      )
      .mockResolvedValueOnce(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callChainIdentifier(RPC_URLS, 20)).resolves.toBe(
      CHAIN_IDENTIFIER,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(RPC_URLS[1]);
  });

  it('gives up on an endpoint that stalls mid-body', async () => {
    // fetch resolves on headers, so a body that never arrives has to be caught
    // by the same deadline, or the attempt hangs with the timer already cleared.
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((resolve) =>
            resolve(
              new Response(
                new ReadableStream({
                  start(controller) {
                    init.signal?.addEventListener('abort', () =>
                      controller.error(new Error('aborted')),
                    );
                  },
                }),
                { status: 200 },
              ),
            ),
          ),
      )
      .mockResolvedValueOnce(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callChainIdentifier(RPC_URLS, 20)).resolves.toBe(
      CHAIN_IDENTIFIER,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not send the request when the caller already aborted', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    controller.abort();

    await expect(
      createSuiClient('mainnet', { rpcUrls: RPC_URLS }).call(
        'sui_getChainIdentifier',
        [],
        { signal: controller.signal },
      ),
    ).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops trying endpoints once the caller aborts', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new Error('aborted'));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createSuiClient('mainnet', { rpcUrls: RPC_URLS }).call(
        'sui_getChainIdentifier',
        [],
        { signal: controller.signal },
      ),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back when a node answers -32601 with HTTP 200', async () => {
    // The deprecated fullnodes answer exactly like this, so a status-only
    // health check would have treated the outage as a success.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRpcErrorResponse(-32601))
      .mockResolvedValueOnce(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callChainIdentifier()).resolves.toBe(CHAIN_IDENTIFIER);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(RPC_URLS[1]);
  });

  it('surfaces a request-level JSON-RPC error without failing over', async () => {
    // -32602 is the node telling us our params are wrong, not that it is down.
    const fetchMock = vi.fn().mockResolvedValue(jsonRpcErrorResponse(-32602));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callChainIdentifier()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps using the endpoint that last worked', async () => {
    // A fresh Response per call, a shared one would already be consumed.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unhealthyResponse(503))
      .mockImplementation(async () => jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    const client = createSuiClient('mainnet', { rpcUrls: RPC_URLS });

    await client.call('sui_getChainIdentifier', []);
    await client.call('sui_getChainIdentifier', []);

    // First call: dead head, then the second endpoint. Second call must start
    // from that one rather than paying for the dead head again.
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      RPC_URLS[0],
      RPC_URLS[1],
      RPC_URLS[1],
    ]);
  });

  it('does not retry a request the node answered', async () => {
    const fetchMock = vi.fn().mockResolvedValue(unhealthyResponse(400));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callChainIdentifier()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws once every endpoint is exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(unhealthyResponse(503));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callChainIdentifier()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(RPC_URLS.length);
  });
});
