/**
 * Live probe of the default Sui JSON-RPC endpoints.
 *
 * Talks to third-party nodes, so it is excluded from the unit run and lives
 * behind `yarn workspace @lombard.finance/sdk-sui test:live`.
 *
 * It guards the reason `createSuiClient` exists: Sui Foundation switched its
 * public fullnodes off, and the nodes this package moved to are on borrowed
 * time too, since JSON-RPC is due to be stripped out of the node binary in
 * mid-October 2026.
 *
 * A single flaky node must not fail the run, so this asserts at least one
 * endpoint per network is reachable. Losing all of them is a real outage.
 */
import { describe, expect, it } from 'vitest';

import { getDefaultSuiRpcUrls, type SuiNetwork } from '../createSuiClient';

const NETWORKS: SuiNetwork[] = ['mainnet', 'testnet'];

interface EndpointProbe {
  url: string;
  alive: boolean;
  reason: string;
}

async function probe(url: string): Promise<EndpointProbe> {
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
}

describe('Sui JSON-RPC endpoints', () => {
  it.each(NETWORKS)(
    'serves JSON-RPC on at least one %s endpoint',
    async (network) => {
      const results = await Promise.all(
        getDefaultSuiRpcUrls(network).map(probe),
      );

      const dead = results.filter((result) => !result.alive);
      const report = dead
        .map((result) => `  ${result.url}: ${result.reason}`)
        .join('\n');

      // A single flaky node must not fail the run, and the message carries which
      // ones are down, so nothing is logged here: `no-console` is an error in
      // this repository.
      expect(
        results.some((result) => result.alive),
        `No Sui ${network} JSON-RPC endpoint is reachable:\n${report}`,
      ).toBe(true);
    },
    30_000,
  );
});
