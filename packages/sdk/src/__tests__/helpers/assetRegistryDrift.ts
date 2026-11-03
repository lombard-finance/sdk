/**
 * Compares the SDK's bundled asset catalog with the backend's public registry.
 *
 * The registry is two unauthenticated lists, `GET /v2/chains` and
 * `GET /v2/assets`. Each asset row names its chain by a string that is a plain
 * name in one environment (`ethereum`) and an alias in another
 * (`ethereum_sepolia`), so a row is joined to its chain by reducing that string
 * to its network family and matching the chain list's `name`. The chain list
 * then supplies the numeric chain id.
 *
 * Scope is the two assets the registry carries, LBTC and BTC.b, on EVM chains.
 * The registry's chain ids for Solana (a full genesis hash against the SDK's
 * 32-character reference) and Sui (a chain hash against the SDK's cluster
 * name) do not map one to one onto the SDK's CAIP-2 values, so those rows are
 * counted and reported but never compared.
 *
 * The comparison is pure. The caller fetches, which keeps it testable offline.
 */

import type { Env } from '@lombard.finance/sdk-common';

import { getMovementChainFamily } from '../../api-functions/getPortfolioMovements/movements';
import type { FeatureConfig } from '../../common/feature-config';
import { featureConfig } from '../../common/feature-config';
import type { AssetCatalog } from '../../core';
import {
  ASSET_CATALOG,
  AssetId,
  Chain,
  getAssetAddress,
  getAssetChains,
  getAssetRouter,
  getBridgeAdapter,
  getChainName,
  isChain,
  isEvmChain,
  isRetiredChain,
} from '../../core';

/** A row of `GET /v2/chains`. */
export interface RegistryChain {
  chain_id: string;
  name: string;
  ecosystem: string;
}

/** A row of `GET /v2/assets`. */
export interface RegistryAsset {
  address: string;
  asset_type: string;
  chain: string;
}

export interface DriftReport {
  /** Differences in the catalog that the SDK should fix. */
  failures: string[];
  /** Differences worth knowing about that are not catalog defects. */
  info: string[];
  /** Registry deployments that were compared with the catalog. */
  compared: number;
}

/** The registry's `asset_type` values this comparison covers. */
const COMPARED_ASSETS: Readonly<Record<string, AssetId>> = {
  lbtc: AssetId.LBTC,
  btcb: AssetId.BTCb,
};

/**
 * Chains the catalog lists only while a feature flag is on. With the flag off
 * the SDK deliberately does not offer the chain, so a registry deployment
 * there is a release decision, not drift.
 */
const FLAG_GATED_CHAINS: ReadonlyArray<{
  chain: Chain;
  flag: keyof FeatureConfig;
}> = [
  { chain: Chain.ETHERLINK, flag: 'isEtherlinkEnabled' },
  { chain: Chain.AVALANCHE, flag: 'isAvalancheMainnetEnabled' },
  { chain: Chain.MONAD, flag: 'isMonadEnabled' },
];

/**
 * Registry deployments the catalog is known to omit on purpose, keyed
 * `${assetId} ${chain}`, each with the reason. A match is reported as
 * information instead of failing; an entry that no longer matches any registry
 * row is reported too, so it gets removed rather than left to hide a later
 * regression.
 */
export type KnownOmissions = Readonly<Record<string, string>>;

export function compareRegistryToCatalog(input: {
  env: Env;
  chains: RegistryChain[];
  assets: RegistryAsset[];
  catalog?: AssetCatalog;
  knownOmissions?: KnownOmissions;
}): DriftReport {
  const {
    env,
    chains,
    assets,
    catalog = ASSET_CATALOG,
    knownOmissions = {},
  } = input;
  const usedOmissions = new Set<string>();
  const failures: string[] = [];
  const info: string[] = [];
  let compared = 0;

  const chainsByFamily = new Map<string, RegistryChain>();
  for (const chain of chains) {
    const family = getMovementChainFamily(chain.name);
    if (family) chainsByFamily.set(family, chain);
  }

  // `${asset} ${chain}` for every registry row on a chain the SDK compares,
  // so the catalog can be read back against it.
  const listed = new Set<string>();

  for (const row of assets) {
    const assetId = COMPARED_ASSETS[row.asset_type];
    if (!assetId) {
      info.push(
        `registry asset type "${row.asset_type}" on ${row.chain}: not compared`,
      );
      continue;
    }

    const family = getMovementChainFamily(row.chain);
    const registryChain = family ? chainsByFamily.get(family) : undefined;
    if (!registryChain) {
      info.push(
        `${assetId} on registry chain "${row.chain}": not in the registry's chain list, not compared`,
      );
      continue;
    }

    if (
      registryChain.ecosystem !== 'evm' ||
      !/^\d+$/.test(registryChain.chain_id)
    ) {
      info.push(
        `${assetId} on ${registryChain.name} (${registryChain.ecosystem}): non-EVM, not compared`,
      );
      continue;
    }

    const chain = `eip155:${registryChain.chain_id}`;
    if (!isChain(chain)) {
      info.push(
        `${assetId} on ${registryChain.name} (${chain}) at ${row.address}: the SDK has no such chain`,
      );
      continue;
    }
    if (isRetiredChain(chain)) {
      info.push(
        `${assetId} on ${registryChain.name} (${chain}) at ${row.address}: the SDK has retired this chain`,
      );
      continue;
    }

    const where = `${assetId} on ${registryChain.name} (${chain})`;
    const registryAddress = row.address.toLowerCase();
    const token = getAssetAddress(assetId, env, chain, catalog);
    const adapter = getBridgeAdapter(assetId, env, chain, catalog);
    const router = getAssetRouter(assetId, env, chain, catalog);

    listed.add(`${assetId} ${chain}`);
    compared += 1;

    if (token === undefined) {
      const omission = knownOmissions[`${assetId} ${chain}`];
      const gate = FLAG_GATED_CHAINS.find(
        (entry) => entry.chain === chain && !featureConfig[entry.flag],
      );
      if (omission !== undefined) {
        usedOmissions.add(`${assetId} ${chain}`);
        info.push(
          `${where}: registry lists ${row.address}, catalog has no deployment (accepted: ${omission})`,
        );
      } else if (gate) {
        info.push(
          `${where}: registry lists ${row.address}, catalog has no deployment while ${gate.flag} is off`,
        );
      } else {
        failures.push(
          `${where}: registry lists ${row.address}, catalog has no deployment`,
        );
      }
    } else if (token.toLowerCase() === registryAddress) {
      // In agreement.
    } else if (adapter?.toLowerCase() === registryAddress) {
      // Known difference: the registry names the bridge adapter for this
      // deployment, where the catalog keeps the token and the adapter apart.
      info.push(
        `${where}: registry lists the bridge adapter ${row.address}, catalog token is ${token}`,
      );
    } else if (router?.toLowerCase() === registryAddress) {
      info.push(
        `${where}: registry lists the asset router ${row.address}, catalog token is ${token}`,
      );
    } else {
      failures.push(
        `${where}: registry lists ${row.address}, catalog has ${token}`,
      );
    }
  }

  let nonEvmCatalog = 0;
  for (const assetId of Object.values(COMPARED_ASSETS)) {
    for (const chain of new Set(getAssetChains(assetId, env, catalog))) {
      if (!isEvmChain(chain)) {
        nonEvmCatalog += 1;
      } else if (!listed.has(`${assetId} ${chain}`)) {
        info.push(
          `${assetId} on ${getChainName(chain)} (${chain}) at ${getAssetAddress(assetId, env, chain, catalog)}: in the catalog, not in the registry`,
        );
      }
    }
  }
  for (const key of Object.keys(knownOmissions)) {
    if (!usedOmissions.has(key)) {
      info.push(
        `accepted omission "${key}" matches no registry row; remove it from the list`,
      );
    }
  }
  if (nonEvmCatalog > 0) {
    info.push(
      `${nonEvmCatalog} non-EVM catalog deployment(s) not compared (EVM only)`,
    );
  }

  return { failures: failures.sort(), info: info.sort(), compared };
}
