/**
 * Covers the Sui gRPC-Web transport in `createSuiGrpcClient`.
 *
 * The failover cases pin their own endpoint list through `grpcUrls`, so they
 * do not depend on the network passed, and they drive the client through a
 * stubbed global `fetch` rather than the wire.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSuiGrpcClient,
  getDefaultSuiGrpcUrls,
} from '../createSuiGrpcClient';

const GRPC_URLS = [
  'https://first.example',
  'https://second.example',
  'https://third.example',
];

const READ_PATH = '/sui.rpc.v2.LedgerService/GetServiceInfo';
const SUBMIT_PATH =
  '/sui.rpc.v2.TransactionExecutionService/ExecuteTransaction';

/** One grpc-web frame: a tag byte, a big-endian length, the payload. */
function frame(tag: number, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(5 + payload.length);

  bytes[0] = tag;
  new DataView(bytes.buffer).setUint32(1, payload.length, false);
  bytes.set(payload, 5);

  return bytes;
}

/**
 * How a healthy node answers a unary call in the text format: HTTP 200 with a
 * base64 body of a data frame followed by a trailer frame carrying the status.
 * An empty protobuf message is a valid `GetServiceInfoResponse`, every field
 * of it is optional.
 */
function grpcWebResponse(): Response {
  const data = frame(0x00, new Uint8Array(0));
  const trailer = frame(0x80, new TextEncoder().encode('grpc-status: 0\r\n'));
  const bytes = new Uint8Array([...data, ...trailer]);

  return new Response(btoa(String.fromCharCode(...bytes)), {
    status: 200,
    headers: { 'Content-Type': 'application/grpc-web-text' },
  });
}

function unhealthyResponse(status: number): Response {
  return new Response('nope', { status });
}

/**
 * How a node that cannot serve a method answers: a trailers-only response,
 * HTTP 200 with the gRPC status in the HTTP headers and no body frames.
 */
function grpcStatusResponse(code: number): Response {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'application/grpc-web-text',
      'grpc-status': String(code),
    },
  });
}

/** Any unary read works here, the transport is what is under test. */
const callServiceInfo = (grpcUrls = GRPC_URLS, timeoutMs?: number) =>
  createSuiGrpcClient('mainnet', {
    grpcUrls,
    timeoutMs,
  }).ledgerService.getServiceInfo({}).response;

/** A submit, which must not be re-sent to a second node. */
const submitTransaction = (grpcUrls = GRPC_URLS, timeoutMs?: number) =>
  createSuiGrpcClient('mainnet', {
    grpcUrls,
    timeoutMs,
  }).transactionExecutionService.executeTransaction({ signatures: [] })
    .response;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getDefaultSuiGrpcUrls', () => {
  it.each(['mainnet', 'testnet'] as const)(
    'returns https endpoints with the official fullnode first on %s',
    (network) => {
      const urls = getDefaultSuiGrpcUrls(network);

      expect(urls.length).toBeGreaterThan(1);
      urls.forEach((url) => expect(url).toMatch(/^https:\/\//));

      // Unlike JSON-RPC, gRPC is what the official fullnodes kept serving.
      expect(urls[0]).toContain('sui.io');
    },
  );
});

describe('createSuiGrpcClient endpoint validation', () => {
  it.each([
    ['http://insecure.example', 'must be https'],
    ['not-a-url', 'not a valid url'],
    ['', 'not a valid url'],
    // A query string cannot survive the transport appending the method path,
    // and silently dropping it would strip a provider's API key.
    ['https://node.example?key=abc', 'cannot carry a query string'],
    // WHATWG fetch refuses urls with userinfo, so every attempt would fail
    // with a TypeError that does not say why.
    ['https://user:key@node.example', 'cannot carry credentials'],
  ])('rejects %s', (grpcUrl, reason) => {
    expect(() =>
      createSuiGrpcClient('mainnet', { grpcUrls: [grpcUrl] }),
    ).toThrow(reason);
  });

  it.each([
    'http://localhost:9000',
    'http://127.0.0.1:9000',
    // The whole of 127.0.0.0/8 is loopback, not just .1.
    'http://127.0.0.2:9000',
    'http://[::1]:9000',
  ])('allows %s so a local fullnode can be used', (grpcUrl) => {
    expect(() =>
      createSuiGrpcClient('localnet', { grpcUrls: [grpcUrl] }),
    ).not.toThrow();
  });

  it('still rejects a remote host that merely starts with 127', () => {
    expect(() =>
      createSuiGrpcClient('mainnet', { grpcUrls: ['http://127.evil.example'] }),
    ).toThrow('must be https');
  });

  it('keeps the path prefix of a proxied endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await callServiceInfo(['https://node.example/sui-grpc/']);

    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://node.example/sui-grpc${READ_PATH}`,
    );
  });

  it('treats an empty grpcUrls array as not supplied', async () => {
    // A consumer spreading its own config can end up with `grpcUrls: []`; the
    // client must fall back to the defaults rather than build with zero
    // endpoints and fail only at request time.
    const fetchMock = vi.fn().mockResolvedValue(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await callServiceInfo([]);

    // The endpoint is rebuilt from its parsed parts, which drops the default
    // https port, so compare against the origin rather than the raw config.
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${new URL(getDefaultSuiGrpcUrls('mainnet')[0]).origin}${READ_PATH}`,
    );
  });
});

describe('createSuiGrpcClient', () => {
  it('sends the request to the first endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await callServiceInfo();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${GRPC_URLS[0]}${READ_PATH}`);
  });

  it('falls back to the next endpoint when a node is unreachable', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await callServiceInfo();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(`${GRPC_URLS[1]}${READ_PATH}`);
  });

  it.each([403, 404, 405, 429, 500, 501, 502, 503])(
    'falls back to the next endpoint on HTTP %i',
    async (status) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(unhealthyResponse(status))
        .mockResolvedValueOnce(grpcWebResponse());
      vi.stubGlobal('fetch', fetchMock);

      await callServiceInfo();

      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    [12, 'UNIMPLEMENTED'],
    [13, 'INTERNAL'],
    [14, 'UNAVAILABLE'],
    [8, 'RESOURCE_EXHAUSTED'],
  ])(
    'falls back when a node answers grpc-status %i %s with HTTP 200',
    async (code) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(grpcStatusResponse(code))
        .mockResolvedValueOnce(grpcWebResponse());
      vi.stubGlobal('fetch', fetchMock);

      await callServiceInfo();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toBe(`${GRPC_URLS[1]}${READ_PATH}`);
    },
  );

  it('surfaces a request-level gRPC error without failing over', async () => {
    // NOT_FOUND is the node telling us the object is not there, not that the
    // node is down.
    const fetchMock = vi.fn().mockResolvedValue(grpcStatusResponse(5));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callServiceInfo()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back when a node answers 200 without speaking gRPC-Web', async () => {
    // A proxy landing page or a JSON error is a node that dropped the
    // protocol; taking it at face value would pin the node as healthy and
    // hand the transport a body it cannot parse.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('<html>welcome</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await callServiceInfo();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(`${GRPC_URLS[1]}${READ_PATH}`);
  });

  it('keeps using the endpoint that last worked', async () => {
    // A fresh Response per call, a shared one would already be consumed.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unhealthyResponse(503))
      .mockImplementation(async () => grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    const client = createSuiGrpcClient('mainnet', { grpcUrls: GRPC_URLS });

    await client.ledgerService.getServiceInfo({}).response;
    await client.ledgerService.getServiceInfo({}).response;

    // First call: dead head, then the second endpoint. Second call must start
    // from that one rather than paying for the dead head again.
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      `${GRPC_URLS[0]}${READ_PATH}`,
      `${GRPC_URLS[1]}${READ_PATH}`,
      `${GRPC_URLS[1]}${READ_PATH}`,
    ]);
  });

  it('does not retry a request the node answered', async () => {
    const fetchMock = vi.fn().mockResolvedValue(unhealthyResponse(400));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callServiceInfo()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send the request when the caller already aborted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    controller.abort();

    await expect(
      createSuiGrpcClient('mainnet', {
        grpcUrls: GRPC_URLS,
      }).ledgerService.getServiceInfo({}, { abort: controller.signal })
        .response,
    ).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stops trying endpoints once the caller aborts', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.resolve(unhealthyResponse(503));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createSuiGrpcClient('mainnet', {
        grpcUrls: GRPC_URLS,
      }).ledgerService.getServiceInfo({}, { abort: controller.signal })
        .response,
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

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
      .mockResolvedValueOnce(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await callServiceInfo(GRPC_URLS, 20);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(`${GRPC_URLS[1]}${READ_PATH}`);
  });

  it('gives up on an endpoint that stalls mid-body', async () => {
    // fetch resolves on headers, so a body that never arrives has to be caught
    // by the same deadline, or the attempt hangs with the timer already
    // cleared.
    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_url: string, init: RequestInit) =>
        Promise.resolve(
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
      )
      .mockResolvedValueOnce(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await callServiceInfo(GRPC_URLS, 20);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not re-send a submit that a node answered with a 5xx', async () => {
    // The node may have taken the transaction before it broke, and the next
    // node's rejection would be reported for one that actually landed.
    const fetchMock = vi.fn().mockResolvedValue(unhealthyResponse(503));
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitTransaction()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not re-send a submit that timed out', async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitTransaction(GRPC_URLS, 20)).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not re-send a submit a node answered grpc-status 13 to', async () => {
    // INTERNAL covers one request failing inside an otherwise healthy node,
    // which may have executed the transaction on the way down.
    const fetchMock = vi.fn().mockResolvedValue(grpcStatusResponse(13));
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitTransaction()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('moves a submit to the next node when the first does not serve it', async () => {
    // UNIMPLEMENTED says the method is unknown there, nothing was executed.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(grpcStatusResponse(12))
      .mockResolvedValueOnce(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await submitTransaction();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(`${GRPC_URLS[1]}${SUBMIT_PATH}`);
  });

  it.each([404, 405, 501])(
    'moves a submit to the next node when the route is not served (HTTP %i)',
    async (status) => {
      // How a node that dropped gRPC-Web answers: the HTTP server is up and
      // nothing serves the method path, so nothing was executed. It carries no
      // grpc-status at all, which is why the status has to count on its own.
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(unhealthyResponse(status))
        .mockResolvedValueOnce(grpcWebResponse());
      vi.stubGlobal('fetch', fetchMock);

      await submitTransaction();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toBe(`${GRPC_URLS[1]}${SUBMIT_PATH}`);
    },
  );

  it('does not re-send a submit a proxy answered with 403', async () => {
    // A read moves on from a 403, but it is not proof the request was never
    // routed the way a 404 is: a proxy answers it for requests it did forward.
    const fetchMock = vi.fn().mockResolvedValue(unhealthyResponse(403));
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitTransaction()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails over a simulate, which executes nothing', async () => {
    // SimulateTransaction shares the service with the submit but is a dry run,
    // so it is retryable like any other read.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unhealthyResponse(503))
      .mockResolvedValueOnce(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await createSuiGrpcClient('mainnet', {
      grpcUrls: GRPC_URLS,
    }).transactionExecutionService.simulateTransaction({}).response;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${GRPC_URLS[1]}/sui.rpc.v2.TransactionExecutionService/SimulateTransaction`,
    );
  });

  it('fails over a state read', async () => {
    // The coin metadata read the decimals fallback hangs off, on a service of
    // its own; the allowlist has to cover it or a balance would fail on the
    // first unhealthy node.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unhealthyResponse(503))
      .mockResolvedValueOnce(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await createSuiGrpcClient('mainnet', {
      grpcUrls: GRPC_URLS,
    }).stateService.getCoinInfo({ coinType: '0x2::sui::SUI' }).response;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${GRPC_URLS[1]}/sui.rpc.v2.StateService/GetCoinInfo`,
    );
  });

  it('submits on the path the read/write split is pinned to', async () => {
    // The split is by path, so the name in `isSuiGrpcReadPath` and the one the
    // transport actually uses have to stay the same string.
    const fetchMock = vi.fn().mockResolvedValue(grpcWebResponse());
    vi.stubGlobal('fetch', fetchMock);

    await submitTransaction();

    expect(fetchMock.mock.calls[0][0]).toBe(`${GRPC_URLS[0]}${SUBMIT_PATH}`);
  });

  it('passes a subscription straight through without failover', async () => {
    // A server stream cannot be drained up front the way unary answers are;
    // the body only ends when the subscription does.
    const fetchMock = vi.fn().mockResolvedValue(unhealthyResponse(503));
    vi.stubGlobal('fetch', fetchMock);

    const call = createSuiGrpcClient('mainnet', {
      grpcUrls: GRPC_URLS,
    }).subscriptionService.subscribeCheckpoints({});

    // `headers` resolves before the transport inspects the status, so the
    // rejection surfaces on `status`.
    await expect(call.status).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${GRPC_URLS[0]}/sui.rpc.v2.SubscriptionService/SubscribeCheckpoints`,
    );
  });

  it('throws once every endpoint is exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(unhealthyResponse(503));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callServiceInfo()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(GRPC_URLS.length);
  });
});
