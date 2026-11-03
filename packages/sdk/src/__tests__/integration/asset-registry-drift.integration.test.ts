/**
 * Asset catalog against the backend's public registry (online, opt-in)
 *
 * Fetches `GET /v2/chains` and `GET /v2/assets` from each environment's v2
 * gateway and compares the LBTC and BTC.b deployments in them with
 * `ASSET_CATALOG`. Both routes are public: no token, no paging.
 *
 * Run:
 *
 *   ENABLE_ONLINE_INTEGRATION=true yarn workspace @lombard.finance/sdk \
 *     vitest run --config vitest.integration.online.config.ts asset-registry-drift
 *
 * Without the flag every test here is skipped. The file is also listed only in
 * `vitest.integration.online.config.ts` and excluded from the unit and mocked
 * integration configs, so the offline gate never reaches it.
 *
 * EVM chains only; see `helpers/assetRegistryDrift.ts` for why.
 *
 * What fails and what is only reported
 * ------------------------------------
 * A test fails for a deployment on a chain the SDK supports that either
 * (a) the registry lists and the catalog lacks, or (b) the catalog has at a
 * different address from the registry's. Both are defects in the catalog: the
 * SDK would refuse a route the backend serves, or point a caller at a contract
 * the backend does not know. Address comparison ignores case, and a registry
 * address equal to the catalog's bridge adapter or asset router is accepted,
 * because for some deployments the registry names that contract where the
 * catalog keeps token and adapter apart.
 *
 * Two kinds of difference are printed but never fail the run:
 *
 *  - registry rows on chains the SDK has no entry for, or has retired;
 *  - catalog deployments the registry does not list.
 *
 * A third is printed rather than failed because the SDK states it: a registry
 * deployment on a chain the catalog lists only behind a feature flag that is
 * off, and the few named entries in `KNOWN_OMISSIONS`.
 *
 * Neither is wrong by construction. The registry and the SDK ship separately,
 * so either can be ahead of the other: a chain the registry has gained is a
 * feature the SDK has not shipped yet, and a deployment the SDK carries early,
 * or on a network the registry does not index, is not an error either. Failing
 * on those would make the suite red for reasons no change to the catalog
 * should fix, and a check that is red by default gets ignored.
 */

import { Env } from '@lombard.finance/sdk-common';
import { beforeAll, describe, expect, it } from 'vitest';

import { getApiConfig } from '../../common/api-config';
import { httpRequest } from '../../utils/http';
import {
  compareRegistryToCatalog,
  type DriftReport,
  type KnownOmissions,
  type RegistryAsset,
  type RegistryChain,
} from '../helpers/assetRegistryDrift';

const ENABLED = process.env.ENABLE_ONLINE_INTEGRATION === 'true';

const ENVS = [Env.prod, Env.stage, Env.testnet] as const;

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Registry deployments the catalog leaves out on purpose. Each needs its
 * reason; a new entry here is a decision, not a fix.
 */
const KNOWN_OMISSIONS: Partial<Record<Env, KnownOmissions>> = {
  [Env.stage]: {
    // A retired testnet. The catalog dropped it and has no stage deployment on
    // it, while the registry still lists one. The chain identifier remains in
    // the SDK, so the registry row is on a chain the SDK knows.
    'LBTC eip155:80084': 'Berachain Bartio is a retired testnet',
  },
};

async function fetchRegistry(env: Env) {
  const { baseApiV2Url } = getApiConfig(env);
  const [chains, assets] = await Promise.all([
    httpRequest<{ chains?: RegistryChain[] }>({
      url: `${baseApiV2Url}/v2/chains`,
      timeout: REQUEST_TIMEOUT_MS,
    }),
    httpRequest<{ assets?: RegistryAsset[] }>({
      url: `${baseApiV2Url}/v2/assets`,
      timeout: REQUEST_TIMEOUT_MS,
    }),
  ]);
  return {
    chains: chains.data.chains ?? [],
    assets: assets.data.assets ?? [],
  };
}

function lines(items: string[]): string {
  return items.map((item) => `  - ${item}`).join('\n');
}

describe.skipIf(!ENABLED)('ASSET_CATALOG against the backend registry', () => {
  describe.each(ENVS)('%s', (env) => {
    let report: DriftReport;
    let registrySize: { chains: number; assets: number };

    beforeAll(async () => {
      const registry = await fetchRegistry(env);
      registrySize = {
        chains: registry.chains.length,
        assets: registry.assets.length,
      };
      report = compareRegistryToCatalog({
        env,
        ...registry,
        knownOmissions: KNOWN_OMISSIONS[env],
      });
    });

    it('lists no deployment the catalog lacks or has at another address', () => {
      // An empty or reshaped response would otherwise pass with nothing
      // compared.
      expect(
        report.compared,
        `no registry deployment was compared (${registrySize.chains} chains, ${registrySize.assets} assets returned)`,
      ).toBeGreaterThan(0);

      if (report.failures.length > 0) {
        throw new Error(
          `${env}: ${report.failures.length} deployment(s) differ between the registry and the catalog:\n${lines(report.failures)}`,
        );
      }
    });

    it('reports the remaining differences as information', () => {
      // `no-console` is not enforced for this package; the output is the
      // point of this test, and it never fails.
      console.info(
        `[${env}] ${report.compared} registry deployment(s) compared; ${report.info.length} informational item(s)` +
          (report.info.length > 0 ? `:\n${lines(report.info)}` : ''),
      );
      expect(report.info).toBeDefined();
    });
  });
});
