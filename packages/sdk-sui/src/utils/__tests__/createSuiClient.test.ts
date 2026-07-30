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
    network => {
      const urls = getDefaultSuiRpcUrls(network);

      expect(urls.length).toBeGreaterThan(1);

      urls.forEach(url => {
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
    async status => {
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
