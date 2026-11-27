import { BlockTag, RpcProvider, WalletAccount } from 'starknet';

import { StarknetChainId } from './chains';

/**
 * RPC endpoints per chain, tried in order.
 *
 * A list rather than a single URL because one public node is a single point of
 * failure, and the failure is not always loud. `rpc.starknet.lava.build`, the
 * previous sole mainnet endpoint, was retired and now answers HTTP 410 to
 * every request, which took down every on-chain read at once. A rate-limited
 * node is worse: drpc reports JSON-RPC `-32601`, "the method starknet_call
 * does not exist/is not available", which reads as a protocol problem and is
 * really a quota. Either way the answer is to ask a different node.
 *
 * Order is by measured reliability. Twelve sequential `starknet_call` requests
 * per endpoint, from a cold client, against the LBTC token contract:
 *
 * ```
 * mainnet   api.cartridge.gg              12/12   median 308ms
 * mainnet   api.zan.top                   12/12   median  44ms
 * mainnet   starknet.api.onfinality.io     4/12   8x -32029 (rate limit)
 * mainnet   starknet.drpc.org              0/12   12x -32601 (starknet_call unsupported)
 * mainnet   starknet-mainnet.public.blastapi.io   HTTP 403, service retired
 * mainnet   rpc.starknet.lava.build        HTTP 410, service retired
 * sepolia   api.cartridge.gg              12/12   median 297ms
 * sepolia   starknet-sepolia.drpc.org     12/12   median 259ms
 * ```
 *
 * The endpoints that did not make the list are recorded above so a future
 * outage does not spend the same measurements again. All of the listed ones are
 * free and need no key. If that changes, or another node is retired,
 * {@link setStarknetRpcEndpoints} replaces the list without a release.
 */
const DEFAULT_RPC_ENDPOINTS: Record<StarknetChainId, readonly string[]> = {
  [StarknetChainId.SN_MAIN]: [
    'https://api.cartridge.gg/x/starknet/mainnet',
    'https://api.zan.top/public/starknet-mainnet',
  ],
  [StarknetChainId.SN_SEPOLIA]: [
    'https://api.cartridge.gg/x/starknet/sepolia',
    'https://starknet-sepolia.drpc.org',
  ],
};

/** Per-request deadline. A node that has stopped answering must not hang a read. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * JSON-RPC codes that mean "ask another node", not "this cannot work".
 *
 * `-32601` is the surprising one: a rate-limited node reports the *method* as
 * unavailable rather than reporting the limit, so a code that normally means
 * "unsupported" has to be treated as retryable here. `-32029` and `-32000` are
 * the vendor-specific spellings of a spent quota and a retired service seen on
 * the endpoints probed above.
 */
const RETRYABLE_RPC_CODES = new Set([
  -32601, -32005, -32603, -32029, -32000, 429,
]);

/** How much of a failing node's body to keep in the error message. */
const MAX_ERROR_BODY_CHARS = 200;

const endpoints = new Map<StarknetChainId, readonly string[]>();
/** The endpoint that last answered, tried first so an outage costs one probe, not one per request. */
const lastGoodEndpoint = new Map<StarknetChainId, string>();
const providers = new Map<StarknetChainId, RpcProvider>();

/**
 * Replace the endpoint list for a chain.
 *
 * For hosts that need a key, or to put a paid node in front of the public ones.
 * Clears the cached provider so the next read picks the new list up.
 *
 * @throws if the list is empty
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
  lastGoodEndpoint.delete(chainId);
  providers.delete(chainId);
}

function endpointsFor(chainId: StarknetChainId): readonly string[] {
  return endpoints.get(chainId) ?? DEFAULT_RPC_ENDPOINTS[chainId];
}

/** The configured endpoints, with the one that last answered moved to the front. */
function requestOrder(chainId: StarknetChainId): readonly string[] {
  const urls = endpointsFor(chainId);
  const lastGood = lastGoodEndpoint.get(chainId);
  if (!lastGood || !urls.includes(lastGood)) {
    return urls;
  }

  return [lastGood, ...urls.filter((url) => url !== lastGood)];
}

type RpcResponseEntry = {
  result?: unknown;
  error?: { code?: unknown };
};

/**
 * Whether a body is an answer, or a reason to try the next node.
 *
 * The HTTP status is deliberately not the test. A node may report a real
 * contract error with a non-2xx status, and failing over on that would replace
 * a precise error with "every endpoint failed" and hide the actual problem. So
 * a body carrying a JSON-RPC error is passed through unless its code says the
 * node itself is the problem.
 */
function isAnswer(text: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // A body that is not JSON at all is not an answer either: retired services
    // return prose, and a proxy in front of one returns an HTML error page.
    return false;
  }

  // A batched request answers with an array; a single one with a bare object.
  const entries = (
    Array.isArray(parsed) ? parsed : [parsed]
  ) as RpcResponseEntry[];
  if (entries.length === 0) {
    return false;
  }

  return entries.every((entry) => {
    if (entry?.result !== undefined) {
      return true;
    }

    const code = entry?.error?.code;
    return typeof code === 'number' && !RETRYABLE_RPC_CODES.has(code);
  });
}

/**
 * Try each endpoint until one answers, then return that answer.
 *
 * Reconstructs the `Response`, because deciding whether to fail over means
 * reading the body and a body can only be read once. Only the content type is
 * carried over: the original length and encoding headers describe the wire
 * bytes, not the decoded text being handed back.
 */
function createBaseFetch(chainId: StarknetChainId) {
  return async function baseFetch(
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const urls = requestOrder(chainId);
    let lastError: unknown;

    for (const url of urls) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        const text = await res.text();

        if (!isAnswer(text)) {
          lastError = new Error(
            `${url} answered ${String(res.status)}: ${text.slice(
              0,
              MAX_ERROR_BODY_CHARS,
            )}`,
          );
          continue;
        }

        lastGoodEndpoint.set(chainId, url);

        return new Response(text, {
          status: res.status,
          statusText: res.statusText,
          headers: { 'content-type': 'application/json' },
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
