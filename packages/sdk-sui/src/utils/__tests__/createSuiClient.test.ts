import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSuiClient,
  getDefaultSuiRpcUrls,
  type SuiNetwork,
} from '../createSuiClient';

const CHAIN_IDENTIFIER = '35834a8a';
const NETWORKS: SuiNetwork[] = ['mainnet', 'testnet'];

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
const callChainIdentifier = (network: SuiNetwork = 'mainnet', rpcUrls?: string[]) =>
  createSuiClient(network, { rpcUrls }).call<string>(
    'sui_getChainIdentifier',
    [],
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getDefaultSuiRpcUrls', () => {
  it.each(NETWORKS)('returns endpoints that still serve JSON-RPC on %s', network => {
    const urls = getDefaultSuiRpcUrls(network);

    expect(urls.length).toBeGreaterThan(1);

    urls.forEach(url => {
      expect(url).toMatch(/^https:\/\//);
      // Sui Foundation fullnodes answer every JSON-RPC method with -32601.
      expect(url).not.toContain('fullnode.mainnet.sui.io');
      expect(url).not.toContain('fullnode.testnet.sui.io');
    });
  });

  it('serves coin metadata on the first testnet endpoint', () => {
    // The other public testnet nodes answer suix_getCoinMetadata with null,
    // which silently degrades any caller that reads coin decimals.
    expect(getDefaultSuiRpcUrls('testnet')[0]).toContain('blockvision');
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
    expect(fetchMock.mock.calls[0][0]).toBe(getDefaultSuiRpcUrls('mainnet')[0]);
  });

  it('prefers caller supplied endpoints over the defaults', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await callChainIdentifier('mainnet', ['https://node.example/rpc']);

    expect(fetchMock.mock.calls[0][0]).toBe('https://node.example/rpc');
  });

  it('falls back to the next endpoint when a node is unreachable', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(jsonRpcResponse(CHAIN_IDENTIFIER));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callChainIdentifier()).resolves.toBe(CHAIN_IDENTIFIER);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(getDefaultSuiRpcUrls('mainnet')[1]);
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

    expect(fetchMock).toHaveBeenCalledTimes(
      getDefaultSuiRpcUrls('mainnet').length,
    );
  });
});

/**
 * Guards the reason this module exists: Sui Foundation switched its public
 * fullnodes off, and the nodes we moved to are on borrowed time too, since
 * JSON-RPC is due to be stripped out of the node binary in mid-October 2026.
 *
 * A single flaky node must not fail CI, so this asserts at least one endpoint
 * per network is reachable. Losing all of them is a real outage.
 */
describe('Sui JSON-RPC endpoints', () => {
  it.each(NETWORKS)(
    'serves JSON-RPC on at least one %s endpoint',
    async network => {
      const results = await Promise.all(
        getDefaultSuiRpcUrls(network).map(async url => {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'sui_getChainIdentifier',
                params: [],
              }),
              signal: AbortSignal.timeout(15_000),
            });

            const payload = (await response.json()) as {
              result?: string;
              error?: { message: string };
            };

            return {
              url,
              alive: response.ok && typeof payload.result === 'string',
              reason: payload.error?.message ?? `HTTP ${response.status}`,
            };
          } catch (error) {
            return { url, alive: false, reason: String(error) };
          }
        }),
      );

      const dead = results.filter(result => !result.alive);
      const report = dead
        .map(result => `  ${result.url}: ${result.reason}`)
        .join('\n');

      expect(
        results.some(result => result.alive),
        `No Sui ${network} JSON-RPC endpoint is reachable:\n${report}`,
      ).toBe(true);

      if (dead.length) {
        console.warn(
          `Sui ${network} JSON-RPC endpoints not responding:\n${report}`,
        );
      }
    },
    30_000,
  );
});
