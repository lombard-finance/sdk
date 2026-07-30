/**
 * Sui JSON-RPC client
 *
 * Builds the `SuiClient` used for reads and transaction execution, with
 * failover across several endpoints.
 *
 * @module utils/createSuiClient
 */

import { getFullnodeUrl, SuiClient, SuiHTTPTransport } from '@mysten/sui/client';

/** Sui networks a client can be created for. */
export type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

/**
 * Sui Foundation disabled JSON-RPC on its public fullnodes, so
 * `getFullnodeUrl()` now resolves to an endpoint that answers every method with
 * `-32601 Method not found`. These nodes still serve it.
 *
 * They are a stopgap: JSON-RPC is scheduled for removal from the Sui node
 * binary in mid-October 2026, after which the client has to move to gRPC.
 *
 * Blockvision goes first on testnet because the other nodes answer
 * `suix_getCoinMetadata` with `null` there, which silently degrades any caller
 * that reads coin decimals.
 */
const DEFAULT_RPC_URLS: Partial<Record<SuiNetwork, string[]>> = {
  mainnet: [
    'https://sui-rpc.publicnode.com',
    'https://sui-mainnet-endpoint.blockvision.org',
    'https://rpc-mainnet.suiscan.xyz',
  ],
  testnet: [
    'https://sui-testnet-endpoint.blockvision.org',
    'https://sui-testnet-rpc.publicnode.com',
    'https://rpc-testnet.suiscan.xyz',
  ],
};

/** Statuses that mean "this node is unhealthy", worth retrying elsewhere. */
const RETRYABLE_STATUSES = [408, 425, 429, 500, 502, 503, 504];

/**
 * Per-endpoint budget. Without it a node that accepts the connection and then
 * hangs would stall the whole call, since failover only advances once an
 * attempt settles. Worst case for a request is this times the endpoint count.
 */
const DEFAULT_TIMEOUT_MS = 20_000;

export interface ISuiRpcOptions {
  /**
   * JSON-RPC endpoints to use instead of the defaults, tried in the order
   * given. Supply your own nodes to avoid the rate limits of public ones.
   */
  rpcUrls?: string[];
  /** Per-endpoint timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Endpoint overrides for callers that do not pick the network themselves, such
 * as {@link suiModule}, where the network is resolved per call from the chain
 * id. Networks left out fall back to {@link getDefaultSuiRpcUrls}.
 */
export interface ISuiNetworkRpcOptions {
  /** Endpoints per network, each tried in the order given. */
  rpcUrls?: Partial<Record<SuiNetwork, string[]>>;
  /** Per-endpoint timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Narrows network-scoped options down to the one network being called.
 */
export function resolveSuiRpcOptions(
  network: SuiNetwork,
  { rpcUrls, timeoutMs }: ISuiNetworkRpcOptions = {},
): ISuiRpcOptions {
  return { rpcUrls: rpcUrls?.[network], timeoutMs };
}

/**
 * Endpoints reach the network, and `rpcUrls` is supplied by whoever embeds this
 * package. Parse each one and rebuild it from its parts, so a malformed entry,
 * or one that would downgrade RPC traffic to plaintext, fails loudly when the
 * client is built instead of being requested.
 */
function toRpcEndpoint(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Sui RPC endpoint is not a valid url: ${value}`);
  }

  // Loopback is exempt so a consumer can point the SDK at a local fullnode.
  const isLoopback =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]';

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) {
    throw new Error(`Sui RPC endpoint must be https: ${value}`);
  }

  // A bare "/" is what URL fills in for a host-only endpoint, keep it off so the
  // request target stays byte-identical to the configured value.
  const path = url.pathname === '/' ? '' : url.pathname;

  return `${url.origin}${path}${url.search}`;
}

/**
 * Endpoints used for a network when the caller does not supply its own.
 *
 * No public node serves JSON-RPC on devnet or localnet, so those keep the Sui
 * default.
 */
export function getDefaultSuiRpcUrls(network: SuiNetwork): string[] {
  return DEFAULT_RPC_URLS[network] ?? [getFullnodeUrl(network)];
}

/**
 * JSON-RPC error codes that mean the node cannot serve the request at all,
 * rather than the request being wrong.
 *
 * This is how the outage that motivated this module actually presents: a
 * deprecated fullnode answers HTTP 200 with `-32601 Method not found`. Judging
 * a node by its status code alone would treat that as a success, and the same
 * shape is expected again once JSON-RPC leaves the node binary.
 */
const UNHEALTHY_RPC_CODES = [-32601, -32603];

/**
 * Reads the JSON-RPC envelope to decide whether the node served the request.
 * Uses a clone so the response body stays intact for the transport, and treats
 * anything unparseable as served, since only the codes above are actionable.
 */
async function isUnhealthyRpcResponse(response: Response): Promise<boolean> {
  try {
    const payload = (await response.clone().json()) as {
      error?: { code?: number };
    };

    return (
      typeof payload?.error?.code === 'number' &&
      UNHEALTHY_RPC_CODES.includes(payload.error.code)
    );
  } catch {
    return false;
  }
}

/**
 * Gives one attempt its own deadline while still honouring an abort from the
 * caller. Composed by hand rather than with `AbortSignal.any`, which Safari
 * only gained in 17.4 and which would throw on every request there.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, timeoutMs);

  init?.signal?.addEventListener('abort', abort);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener('abort', abort);
  }
}

/**
 * Why this node should not be used for the response it just gave, or `null`
 * when it served the request.
 */
async function getUnhealthyReason(response: Response): Promise<string | null> {
  if (RETRYABLE_STATUSES.includes(response.status)) {
    return `responded with ${response.status}`;
  }

  if (await isUnhealthyRpcResponse(response)) {
    return 'cannot serve this method';
  }

  return null;
}

/**
 * The transport bakes a single url into the request, so failover happens here:
 * every attempt re-sends the same body to the next candidate node.
 *
 * Attempts start from the last endpoint that worked rather than always from the
 * head of the list, so one unhealthy node costs its timeout once instead of on
 * every request.
 */
function createFailoverFetch(urls: string[], timeoutMs: number): typeof fetch {
  let preferred = 0;

  return async (_input, init) => {
    let lastError: unknown;

    for (let attempt = 0; attempt < urls.length; attempt += 1) {
      const index = (preferred + attempt) % urls.length;
      const url = urls[index];

      try {
        const response = await fetchWithTimeout(url, init, timeoutMs);
        const reason = await getUnhealthyReason(response);

        if (!reason) {
          preferred = index;

          return response;
        }

        lastError = new Error(`Sui RPC ${url} ${reason}`);
      } catch (error) {
        // The caller gave up, trying the next node would ignore that.
        if (init?.signal?.aborted) {
          throw error;
        }

        lastError = error;
      }
    }

    throw lastError ?? new Error('No Sui RPC endpoint is configured');
  };
}

/**
 * Creates a {@link SuiClient} that falls back to the next endpoint when a node
 * is unreachable, hanging or rate limited.
 */
export function createSuiClient(
  network: SuiNetwork,
  { rpcUrls, timeoutMs = DEFAULT_TIMEOUT_MS }: ISuiRpcOptions = {},
): SuiClient {
  const urls = (
    rpcUrls?.length ? rpcUrls : getDefaultSuiRpcUrls(network)
  ).map(toRpcEndpoint);

  return new SuiClient({
    transport: new SuiHTTPTransport({
      url: urls[0],
      fetch: createFailoverFetch(urls, timeoutMs),
    }),
  });
}
