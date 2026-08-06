/**
 * Sui gRPC-Web client
 *
 * Builds the `SuiGrpcClient` used for reads and transaction execution, with
 * failover across several endpoints. Sui is dropping JSON-RPC from the node
 * binary (scheduled for mid-October 2026); gRPC is what the official fullnodes
 * kept serving.
 *
 * @module utils/createSuiGrpcClient
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';

/** Sui networks a client can be created for. */
export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

/**
 * gRPC-Web endpoints per network, tried in the order given. The official
 * fullnodes serve gRPC-Web directly (that is what deprecated JSON-RPC in their
 * stead), and suiscan is the one public third-party node that answered a
 * gRPC-Web probe. The publicnode and blockvision nodes from the old JSON-RPC
 * list do not speak it.
 */
const DEFAULT_GRPC_URLS: Record<SuiNetwork, string[]> = {
  mainnet: [
    'https://fullnode.mainnet.sui.io:443',
    'https://rpc-mainnet.suiscan.xyz',
  ],
  testnet: [
    'https://fullnode.testnet.sui.io:443',
    'https://rpc-testnet.suiscan.xyz',
  ],
  devnet: ['https://fullnode.devnet.sui.io:443'],
  localnet: ['http://127.0.0.1:9000'],
};

/**
 * Statuses that mean "this node is unhealthy", worth retrying elsewhere.
 *
 * 403 is in here for the proxies the public nodes sit behind: Cloudflare
 * answers `403` with `error code: 1010` for clients it dislikes, and a whole
 * datacenter range can fall into that at any time.
 *
 * 404 and 405 are how a node that dropped gRPC-Web answers: the HTTP server is
 * up but nothing serves the `/package.Service/Method` route. That is this
 * transport's version of the JSON-RPC `-32601` outage.
 */
const RETRYABLE_STATUSES = [403, 404, 405, 408, 425, 429, 500, 502, 503, 504];

/**
 * Per-endpoint budget. Without it a node that accepts the connection and then
 * hangs would stall the whole call, since failover only advances once an
 * attempt settles. Worst case for a request is this times the endpoint count.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * gRPC status codes that mean the node cannot serve the request at all, rather
 * than the request being wrong. `UNIMPLEMENTED` is the gRPC analogue of the
 * JSON-RPC `-32601` that motivated the failover in the first place: the node
 * does not know the method, so nothing was executed.
 */
const GRPC_UNIMPLEMENTED = 12;

/** Rate limited. The next node may have budget left. */
const GRPC_RESOURCE_EXHAUSTED = 8;

/**
 * `INTERNAL` is ambiguous the same way JSON-RPC `-32603` is: it covers both a
 * broken node and one request failing inside it. Retrying a read costs little
 * and can find a node that answers, so it only counts for reads, together with
 * `UNAVAILABLE` which is the server saying "try later" outright.
 */
const GRPC_INTERNAL = 13;
const GRPC_UNAVAILABLE = 14;

const READ_UNHEALTHY_GRPC_CODES = [
  GRPC_RESOURCE_EXHAUSTED,
  GRPC_UNIMPLEMENTED,
  GRPC_INTERNAL,
  GRPC_UNAVAILABLE,
];

export interface ISuiGrpcOptions {
  /**
   * gRPC-Web endpoints to use instead of the defaults, tried in the order
   * given. Supply your own nodes to avoid the rate limits of public ones.
   */
  grpcUrls?: string[];
  /** Per-endpoint timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Endpoint overrides for callers that do not pick the network themselves, such
 * as {@link suiModule}, where the network is resolved per call from the chain
 * id. Networks left out fall back to {@link getDefaultSuiGrpcUrls}.
 */
export interface ISuiNetworkGrpcOptions {
  /** Endpoints per network, each tried in the order given. */
  grpcUrls?: Partial<Record<SuiNetwork, string[]>>;
  /** Per-endpoint timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Narrows network-scoped options down to the one network being called.
 */
export function resolveSuiGrpcOptions(
  network: SuiNetwork,
  { grpcUrls, timeoutMs }: ISuiNetworkGrpcOptions = {},
): ISuiGrpcOptions {
  return { grpcUrls: grpcUrls?.[network], timeoutMs };
}

/**
 * Endpoints reach the network, and `grpcUrls` is supplied by whoever embeds
 * this package. Parse each one and rebuild it from its parts, so a malformed
 * entry, or one that would downgrade traffic to plaintext, fails loudly when
 * the client is built instead of being requested. The transport appends
 * `/<package>.<Service>/<Method>` to the base, so a trailing slash would
 * produce a `//` request target; it is stripped here.
 */
function toGrpcEndpoint(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Sui gRPC endpoint is not a valid url: ${value}`);
  }

  // Loopback is exempt so a consumer can point the SDK at a local fullnode.
  // The whole of 127.0.0.0/8 is loopback, not just 127.0.0.1.
  const isLoopback =
    url.hostname === 'localhost' ||
    url.hostname === '[::1]' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname);

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new Error(`Sui gRPC endpoint must be https: ${value}`);
  }

  // The transport appends `/package.Service/Method` to the base, so a query
  // string cannot survive in a request target. Silently dropping it would
  // strip a provider's API key, so it fails loudly instead.
  if (url.search) {
    throw new Error(`Sui gRPC endpoint cannot carry a query string: ${value}`);
  }

  // WHATWG fetch refuses to construct a request from a url with userinfo in
  // it, so an endpoint with basic auth baked in would fail on every attempt
  // with a TypeError that does not say why. Private gRPC providers put their
  // keys in the path instead.
  if (url.username || url.password) {
    throw new Error(`Sui gRPC endpoint cannot carry credentials: ${value}`);
  }

  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');

  return `${url.protocol}//${url.host}${path}`;
}

/**
 * Endpoints used for a network when the caller does not supply its own.
 */
export function getDefaultSuiGrpcUrls(network: SuiNetwork): string[] {
  return DEFAULT_GRPC_URLS[network];
}

/** A node's answer, with its body already off the wire. */
interface GrpcAttempt {
  status: number;
  headers: Headers;
  /** Rebuilt for the transport, which reads the body itself. */
  toResponse: () => Response;
}

/**
 * Gives one attempt its own deadline while still honouring an abort from the
 * caller. Composed by hand rather than with `AbortSignal.any`, which Safari
 * only gained in 17.4 and which would throw on every request there.
 *
 * The body is drained here rather than left to the transport, so the deadline
 * covers it: `fetch` resolves on headers, and a node that answers and then
 * stalls mid-body would otherwise hang with the timer already cleared.
 * Draining also releases the connection of an answer we are about to discard.
 * The bytes are kept as-is because the grpc-web binary format is not text.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<GrpcAttempt> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, timeoutMs);

  init?.signal?.addEventListener('abort', abort);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.arrayBuffer();

    return {
      status: response.status,
      headers: response.headers,
      // A body is disallowed on 204/205/304, and those carry none anyway.
      toResponse: () =>
        new Response(body.byteLength > 0 ? body : null, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        }),
    };
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener('abort', abort);
  }
}

/**
 * gRPC status of a response, when the node answered trailers-only and the
 * status landed in the HTTP headers. An in-band trailer at the end of the body
 * frame is not read here: parsing it would mean decoding the whole grpc-web
 * framing on every call, and an error carried there still surfaces through the
 * transport as an `RpcError`, it just does not trigger failover.
 */
function getGrpcStatus(headers: Headers): number | null {
  const raw = headers.get('grpc-status');

  if (raw === null) {
    return null;
  }

  const code = Number(raw);

  return Number.isInteger(code) ? code : null;
}

/**
 * Every gRPC-Web answer, healthy or not, is `application/grpc-web*`. A 200
 * with anything else, an HTML landing page or a JSON error from a proxy, is a
 * node that no longer speaks the protocol; taking it at face value would pin
 * the node as healthy and hand the transport a body it cannot parse.
 */
function isGrpcWebResponse(headers: Headers): boolean {
  const contentType = headers.get('content-type');

  return contentType !== null && contentType.startsWith('application/grpc');
}

/**
 * Why this node should not be used for the response it just gave, or `null`
 * when it served the request.
 */
function getUnhealthyReason({ status, headers }: GrpcAttempt): string | null {
  if (RETRYABLE_STATUSES.includes(status)) {
    return `responded with ${status}`;
  }

  if (status === 200 && !isGrpcWebResponse(headers)) {
    return 'does not speak gRPC-Web';
  }

  const grpcStatus = getGrpcStatus(headers);

  if (grpcStatus !== null && READ_UNHEALTHY_GRPC_CODES.includes(grpcStatus)) {
    return `answered grpc-status ${grpcStatus}`;
  }

  return null;
}

/**
 * Whether a transaction submit may be handed to another node. Only
 * `UNIMPLEMENTED` qualifies: the node did not know the method, so nothing was
 * executed. A 5xx or a timeout leaves it open whether the transaction was
 * taken.
 */
function canRetrySubmit({ headers }: GrpcAttempt): boolean {
  return getGrpcStatus(headers) === GRPC_UNIMPLEMENTED;
}

/**
 * The method that changes state, and so must not be re-sent to another node.
 * gRPC puts the method in the request path, `/<package>.<Service>/<Method>`,
 * so unlike JSON-RPC there is no header to consult.
 *
 * Sui dedupes by transaction digest, so a resend is usually harmless, but the
 * harmful case is real: a node that took the transaction and then failed to
 * answer in time would have the next node's rejection reported for a
 * transaction that actually landed.
 */
const EXECUTE_PATH = '/ExecuteTransaction';

/**
 * Server-streaming subscriptions cannot be drained up front the way unary
 * answers are: the body only ends when the subscription does. Nothing in this
 * package subscribes today; if a consumer ever does through this client, the
 * call goes straight through to the preferred node with no failover rather
 * than hanging in the drain.
 */
const STREAMING_PATH = '.SubscriptionService/';

/**
 * The transport bakes the first endpoint into the request url, so failover
 * happens here: every attempt re-sends the same body with the path rebased
 * onto the next candidate node.
 *
 * Attempts start from the last endpoint that worked rather than always from
 * the head of the list, so one unhealthy node costs its timeout once instead
 * of on every request.
 *
 * Only reads walk the list freely. A transaction submit moves on solely when
 * the node answered `UNIMPLEMENTED`, which says it never knew the method and
 * so cannot have executed anything. A timeout or a 5xx is not that: the node
 * may have taken the transaction, and the next node's answer would then be
 * reported for one that already landed.
 */
function createFailoverFetch(urls: string[], timeoutMs: number): typeof fetch {
  let preferred = 0;

  return async (input, init) => {
    // A signal that aborted before the call would never fire its listener, and
    // the request would go out as if nothing had happened. Thrown by hand
    // rather than with `throwIfAborted`, which Safari only gained in 16.4.
    if (init?.signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    // The transport passes a string today; `Request` would stringify to
    // "[object Request]" rather than its url, so it is read explicitly.
    const requested = input instanceof Request ? input.url : String(input);

    // The transport was built with `urls[0]` as its base, so everything after
    // it is the `/package.Service/Method` part every endpoint shares.
    const path = requested.startsWith(urls[0])
      ? requested.slice(urls[0].length)
      : requested;

    if (path.includes(STREAMING_PATH)) {
      return fetch(`${urls[preferred]}${path}`, init);
    }

    const isRead = !path.endsWith(EXECUTE_PATH);
    let lastError: unknown;

    for (let attempt = 0; attempt < urls.length; attempt += 1) {
      // An abort that lands between attempts, while the previous node's answer
      // was being drained, would otherwise buy the next node a full request on
      // behalf of a caller that already gave up.
      if (init?.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      const index = (preferred + attempt) % urls.length;
      const url = `${urls[index]}${path}`;

      try {
        const grpcAttempt = await fetchWithTimeout(url, init, timeoutMs);
        const reason = getUnhealthyReason(grpcAttempt);

        if (!reason) {
          preferred = index;

          return grpcAttempt.toResponse();
        }

        // A submit is handed back unless the node never knew the method, so
        // the transport raises the node's own error rather than this one
        // retrying. The endpoint is left unpinned: it just failed to serve.
        if (!isRead && !canRetrySubmit(grpcAttempt)) {
          return grpcAttempt.toResponse();
        }

        lastError = new Error(`Sui gRPC ${url} ${reason}`);
      } catch (error) {
        // The caller gave up, trying the next node would ignore that.
        if (init?.signal?.aborted) {
          throw error;
        }

        // A submit that failed at the transport, a timeout or a dropped
        // connection, may still have been executed by that node.
        if (!isRead) {
          throw error;
        }

        lastError = error;
      }
    }

    throw lastError ?? new Error('No Sui gRPC endpoint is configured');
  };
}

/**
 * Creates a {@link SuiGrpcClient} that falls back to the next endpoint when a
 * node is unreachable, hanging or rate limited.
 *
 * The transport is built by hand because the `SuiGrpcClient` constructor only
 * forwards `baseUrl` and `fetchInit` to `GrpcWebFetchTransport`; a `fetch`
 * override passed through the client options would be dropped on the floor.
 */
export function createSuiGrpcClient(
  network: SuiNetwork,
  { grpcUrls, timeoutMs = DEFAULT_TIMEOUT_MS }: ISuiGrpcOptions = {},
): SuiGrpcClient {
  const urls = (
    grpcUrls?.length ? grpcUrls : getDefaultSuiGrpcUrls(network)
  ).map(toGrpcEndpoint);

  return new SuiGrpcClient({
    network,
    transport: new GrpcWebFetchTransport({
      baseUrl: urls[0],
      fetch: createFailoverFetch(urls, timeoutMs),
    }),
  });
}
