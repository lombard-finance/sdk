/**
 * Live probe of the default gRPC endpoints.
 *
 * Talks to public nodes, so it is excluded from the unit run and lives behind
 * `yarn workspace @lombard.finance/sdk-sui test:live`.
 *
 * A single flaky node must not fail the run, so this asserts the client can
 * still reach at least one endpoint per network. Losing all of them is a real
 * outage.
 */
import { describe, expect, it } from 'vitest';

import {
  createSuiGrpcClient,
  getDefaultSuiGrpcUrls,
  type SuiNetwork,
} from '../createSuiGrpcClient';

const NETWORKS: SuiNetwork[] = ['mainnet', 'testnet'];

describe.each(NETWORKS)('Sui gRPC endpoints (%s)', (network) => {
  it('serves gRPC-Web on at least one configured endpoint', async () => {
    const results = await Promise.all(
      getDefaultSuiGrpcUrls(network).map(async (url) => {
        try {
          await createSuiGrpcClient(network, {
            grpcUrls: [url],
            timeoutMs: 15_000,
          }).ledgerService.getServiceInfo({}).response;

          return { url, alive: true, reason: '' };
        } catch (error) {
          return { url, alive: false, reason: String(error) };
        }
      }),
    );

    const dead = results.filter((result) => !result.alive);
    const report = dead
      .map((result) => `  ${result.url}: ${result.reason}`)
      .join('\n');

    expect(
      results.some((result) => result.alive),
      `No Sui gRPC endpoint is reachable:\n${report}`,
    ).toBe(true);

    if (dead.length) {
      console.warn(`Sui gRPC endpoints not responding:\n${report}`);
    }
  }, 60_000);
});
