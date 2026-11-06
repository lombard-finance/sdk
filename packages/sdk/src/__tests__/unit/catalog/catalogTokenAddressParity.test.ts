/**
 * The asset catalog and the token address map name the same EVM deployments.
 *
 * Two tables carry the LBTC and BTC.b addresses. The actions resolve tokens
 * through `TOKEN_ADDRESSES`; `getContractInfo`, `sdk.assets` and the chain
 * lists read `ASSET_CATALOG`. Nothing compared them, so the catalog drifted on
 * testnet: it named a different Sepolia LBTC deployment from the one the
 * actions use, and stage's BTC.b on Fuji. A caller reading the catalog then
 * got an address the SDK itself never transacts with.
 *
 * Every EVM deployment the map knows must be in the catalog at the same
 * address, except the ones listed below as known to the map only.
 */
import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import type { ChainId } from '../../../common/chains';
import { featureConfig } from '../../../common/feature-config';
import { AssetId } from '../../../core';
import { getAssetAddress, getBridgeAdapter } from '../../../core/assets/utils';
import { evmChainIdToChain } from '../../../core/chains/utils';
import { Token, TOKEN_ADDRESSES } from '../../../tokens/token-addresses';

const ENVS = [Env.prod, Env.stage, Env.testnet, Env.dev] as const;

const ASSETS = [
  { assetId: AssetId.LBTC, token: Token.LBTC },
  { assetId: AssetId.BTCb, token: Token.BTCb },
] as const;

/**
 * Deployments the map still carries that the catalog leaves out on purpose.
 * Each needs its reason; a new entry here is a decision, not a fix.
 */
const MAP_ONLY = new Set([
  // Gated in the catalog by `isEtherlinkEnabled`, and in the map not at all.
  ...(featureConfig.isEtherlinkEnabled
    ? []
    : [`${AssetId.LBTC} ${Env.prod} eip155:42793`]),
  // Retired testnets (Holesky, Sonic Blaze, Berachain Bartio), which the
  // catalog dropped and the map still carries. The map's entries there are not
  // authoritative either: stage's gateway registry lists Bartio LBTC at a
  // different address from the map's.
  ...[Env.stage, Env.testnet].flatMap((env) =>
    ['17000', '57054', '80084'].map(
      (chainId) => `${AssetId.LBTC} ${env} eip155:${chainId}`,
    ),
  ),
  // BTC.b on Fuji for stage, behind `isAvalancheFujiEnabled`. The gateway's
  // stage registry does not list it either.
  `${AssetId.BTCb} ${Env.stage} eip155:43113`,
]);

type LegacyEntry = string | { token?: string; adapter?: string } | undefined;

function legacyToken(entry: LegacyEntry): string | undefined {
  return typeof entry === 'string' ? entry : entry?.token;
}

function legacyAdapter(entry: LegacyEntry): string | undefined {
  return typeof entry === 'string' ? undefined : entry?.adapter;
}

function lower(value: string | undefined): string | undefined {
  return value?.toLowerCase();
}

/** Every difference between the two tables, as readable lines. */
function differences(): string[] {
  const found: string[] = [];

  for (const { assetId, token } of ASSETS) {
    for (const env of ENVS) {
      const legacy = (TOKEN_ADDRESSES[token]?.[env] ?? {}) as Record<
        string,
        LegacyEntry
      >;

      for (const [chainId, entry] of Object.entries(legacy)) {
        const chain = evmChainIdToChain(Number(chainId) as ChainId);
        if (MAP_ONLY.has(`${assetId} ${env} ${chain}`)) continue;
        const expected = lower(legacyToken(entry));
        const actual = lower(getAssetAddress(assetId, env, chain));

        if (expected && actual !== expected) {
          found.push(
            `${assetId} ${env} ${chain}: catalog ${actual ?? 'missing'}, map ${expected}`,
          );
        }

        const expectedAdapter = lower(legacyAdapter(entry));
        const actualAdapter = lower(getBridgeAdapter(assetId, env, chain));
        if (expectedAdapter && actualAdapter !== expectedAdapter) {
          found.push(
            `${assetId} ${env} ${chain} adapter: catalog ${actualAdapter ?? 'missing'}, map ${expectedAdapter}`,
          );
        }
      }
    }
  }

  return found.sort();
}

describe('ASSET_CATALOG and TOKEN_ADDRESSES', () => {
  it('name the same EVM deployments', () => {
    expect(differences()).toEqual([]);
  });
});
