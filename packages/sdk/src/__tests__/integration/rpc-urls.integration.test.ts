/**
 * Verifies that every public RPC URL declared in `rpcUrlConfig` is reachable
 * and reports the expected chain ID via `eth_chainId`.
 *
 * Opt-in: gated by `ENABLE_ONLINE_INTEGRATION=true` because it hits the live
 * public RPC endpoints.
 */

import { describe, expect, it } from 'vitest';

import { rpcUrlConfig } from '../../clients/rpc-url-config';

const RUN_ONLINE = process.env.ENABLE_ONLINE_INTEGRATION === 'true';
const runIfEnabled = RUN_ONLINE ? describe : describe.skip;

const TIMEOUT = 30_000;

async function fetchChainId(url: string): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: [],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as {
      result?: string;
      error?: { message?: string };
    };

    if (body.error) {
      throw new Error(`JSON-RPC error: ${body.error.message ?? 'unknown'}`);
    }
    if (typeof body.result !== 'string') {
      throw new Error(`Missing result in response: ${JSON.stringify(body)}`);
    }

    return Number.parseInt(body.result, 16);
  } finally {
    clearTimeout(timer);
  }
}

runIfEnabled('Public RPC URLs', () => {
  for (const [chainIdStr, url] of Object.entries(rpcUrlConfig)) {
    const expectedChainId = Number(chainIdStr);

    it(
      `chain ${expectedChainId} responds at ${url} with matching chain ID`,
      async () => {
        const reported = await fetchChainId(url);
        expect(reported).toBe(expectedChainId);
      },
      TIMEOUT,
    );
  }
});
