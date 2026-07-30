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

  if (url.protocol !== 'https:') {
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
 * The transport bakes a single url into the request, so failover happens here:
 * every attempt re-sends the same body to the next candidate node.
 *
 * Each attempt gets its own timeout, combined with the caller's signal so an
 * upstream abort cancels the whole chain rather than just the current node.
 */
function createFailoverFetch(urls: string[], timeoutMs: number): typeof fetch {
  return async (_input, init) => {
    let lastError: unknown;

    for (const url of urls) {
      const timeout = AbortSignal.timeout(timeoutMs);
      const signal = init?.signal
        ? AbortSignal.any([init.signal, timeout])
        : timeout;

      try {
        const response = await fetch(url, { ...init, signal });

        if (!RETRYABLE_STATUSES.includes(response.status)) {
          return response;
        }

        lastError = new Error(
          `Sui RPC ${url} responded with ${response.status}`,
        );
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
