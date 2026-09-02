import { BlockTag, RpcProvider, WalletAccount } from 'starknet';

import { StarknetChainId } from './chains';

/**
 * RPC endpoints per chain, tried in order.
 *
 * A list rather than a single URL because one free public node with no key is
 * a single point of failure that fails *misleadingly*. Once its quota is spent,
 * drpc answers JSON-RPC `-32601`, "the method starknet_call does not
 * exist/is not available" — which reads as a protocol problem and is a rate
 * limit. Every public-key getter then fails and the error names the account,
 * so a healthy, correctly deployed account looks broken.
 *
 * The endpoints here are the ones that were pinned before, kept so this change
 * carries no new assumptions about hosts. Choosing better ones is an
 * operational decision — the useful endpoints need a key — which is what
 * {@link setStarknetRpcEndpoints} exists for.
 */
const DEFAULT_RPC_ENDPOINTS: Record<StarknetChainId, readonly string[]> = {
  [StarknetChainId.SN_MAIN]: ['https://rpc.starknet.lava.build:443'],
  [StarknetChainId.SN_SEPOLIA]: ['https://starknet-sepolia.drpc.org'],
};

/** Per-request deadline. A node that has stopped answering must not hang a signature. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * JSON-RPC codes that mean "ask someone else", not "this cannot work".
 *
 * `-32601` is the surprising one: a rate-limited node reports the *method* as
 * unavailable rather than reporting the limit, so a code that normally means
 * "unsupported" has to be treated as retryable here.
 */
const RETRYABLE_RPC_CODES = new Set([-32601, -32005, -32603, 429]);

const endpoints = new Map<StarknetChainId, readonly string[]>();

/**
 * Replace the endpoint list for a chain.
 *
 * For hosts that need a key, or to put a paid node in front of the public one.
 * Clears the cached provider so the next read picks the new list up.
 */
export function setStarknetRpcEndpoints(
  chainId: StarknetChainId,
  urls: readonly string[],
): void {
  if (urls.length === 0) {
    throw new Error(
      `At least one RPC endpoint is required for chain ${chainId}.`,
    );
  }
  endpoints.set(chainId, [...urls]);
  providers.delete(chainId);
}

function endpointsFor(chainId: StarknetChainId): readonly string[] {
  return endpoints.get(chainId) ?? DEFAULT_RPC_ENDPOINTS[chainId];
}

/** Whether a response body carries a JSON-RPC error worth failing over on. */
function isRetryablePayload(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { error?: { code?: unknown } };
    const code = parsed.error?.code;
    return typeof code === 'number' && RETRYABLE_RPC_CODES.has(code);
  } catch {
    // A body that is not JSON at all is not an answer either. One of the
    // probed nodes returned prose where a payload belonged.
    return true;
  }
}

/**
 * Try each endpoint until one answers, then return that answer.
 *
 * Reconstructs the `Response`, because deciding whether to fail over means
 * reading the body and a body can only be read once.
 */
function createBaseFetch(chainId: StarknetChainId) {
  return async function baseFetch(
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const urls = endpointsFor(chainId);
    let lastError: unknown;

    for (const url of urls) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        const text = await res.text();

        if (!res.ok || isRetryablePayload(text)) {
          lastError = new Error(
            `${url} answered ${String(res.status)}: ${text.slice(0, 200)}`,
          );
          continue;
        }

        return new Response(text, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      } catch (error) {
        // A timeout arrives here as an abort, which is the same decision.
        lastError = error;
      } finally {
        clearTimeout(timer);
      }
    }

    throw new Error(
      `Every Starknet RPC endpoint for chain ${chainId} failed ` +
        `(${String(urls.length)} tried). Last: ${String(lastError)}`,
    );
  };
}

const providers = new Map<StarknetChainId, RpcProvider>();
export const getRpcProvider = (
  chainId: StarknetChainId = StarknetChainId.SN_MAIN,
) => {
  let provider = providers.get(chainId);
  if (!provider) {
    // Default reads to the `latest` block: starknet.js defaults calls to the
    // `pending` tag, which some RPC nodes reject with "unknown block tag".
    provider = new RpcProvider({
      // The first endpoint, so anything reading `nodeUrl` sees a real one.
      // `baseFetch` is what actually chooses, per request.
      nodeUrl: endpointsFor(chainId)[0],
      blockIdentifier: BlockTag.LATEST,
      baseFetch: createBaseFetch(chainId),
    });
    providers.set(chainId, provider);
  }

  return provider;
};

export type ProviderParameters = {
  provider: RpcProvider | WalletAccount;
};
