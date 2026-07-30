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

export interface ISuiRpcOptions {
  /**
   * JSON-RPC endpoints to use instead of the defaults, tried in the order
   * given. Supply your own nodes to avoid the rate limits of public ones.
   */
  rpcUrls?: string[];
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
 */
function createFailoverFetch(urls: string[]): typeof fetch {
  return async (_input, init) => {
    let lastError: unknown;

    for (const url of urls) {
      try {
        const response = await fetch(url, init);

        if (!RETRYABLE_STATUSES.includes(response.status)) {
          return response;
        }

        lastError = new Error(
          `Sui RPC ${url} responded with ${response.status}`,
        );
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('No Sui RPC endpoint is configured');
  };
}

/**
 * Creates a {@link SuiClient} that falls back to the next endpoint when a node
 * is unreachable or rate limited.
 */
export function createSuiClient(
  network: SuiNetwork,
  { rpcUrls }: ISuiRpcOptions = {},
): SuiClient {
  const urls = rpcUrls?.length ? rpcUrls : getDefaultSuiRpcUrls(network);

  return new SuiClient({
    transport: new SuiHTTPTransport({
      url: urls[0],
      fetch: createFailoverFetch(urls),
    }),
  });
}
