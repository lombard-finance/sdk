/**
 * The comparison behind the online registry check, driven with fixtures.
 *
 * The online suite (`asset-registry-drift.integration.test.ts`) only runs when
 * opted in, so on its own nothing in the offline gate would notice the
 * comparison going blind. These tests pin what it fails on, what it only
 * reports, and what it lets through.
 */
import { Env } from '@lombard.finance/sdk-common';
import { afterEach, describe, expect, it } from 'vitest';

import { featureConfig } from '../../../common/feature-config';
import type { AssetCatalog } from '../../../core';
import { AssetId, Chain } from '../../../core';
import {
  compareRegistryToCatalog,
  type RegistryAsset,
  type RegistryChain,
} from '../../helpers/assetRegistryDrift';

const LBTC_SEPOLIA = '0x1111111111111111111111111111111111111111';
const LBTC_BASE = '0x2222222222222222222222222222222222222222';
const BTCB_FUJI = '0x3333333333333333333333333333333333333333';
const BTCB_FUJI_ADAPTER = '0x4444444444444444444444444444444444444444';
const LBTC_BASE_ROUTER = '0x5555555555555555555555555555555555555555';

const catalog: AssetCatalog = {
  version: 'test',
  assets: {
    [AssetId.LBTC]: {
      decimals: 8,
      symbol: 'LBTC',
      deployments: [
        { env: Env.testnet, chain: Chain.SEPOLIA, address: LBTC_SEPOLIA },
        {
          env: Env.testnet,
          chain: Chain.BASE_SEPOLIA,
          address: LBTC_BASE,
          assetRouter: LBTC_BASE_ROUTER,
        },
      ],
    },
    [AssetId.BTCb]: {
      decimals: 8,
      symbol: 'BTC.b',
      deployments: [
        {
          env: Env.testnet,
          chain: Chain.AVALANCHE_FUJI,
          address: BTCB_FUJI,
          bridgeAdapter: BTCB_FUJI_ADAPTER,
        },
        // Another environment's entry must not be read as this one's.
        { env: Env.prod, chain: Chain.BSC, address: LBTC_BASE },
      ],
    },
  },
};

const chains: RegistryChain[] = [
  { chain_id: '11155111', name: 'ethereum', ecosystem: 'evm' },
  { chain_id: '84532', name: 'base', ecosystem: 'evm' },
  { chain_id: '43113', name: 'avalanche', ecosystem: 'evm' },
  { chain_id: '42793', name: 'etherlink', ecosystem: 'evm' },
  { chain_id: '21000000', name: 'corn', ecosystem: 'evm' },
  { chain_id: '57072', name: 'ink', ecosystem: 'evm' },
  {
    chain_id: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
    name: 'solana',
    ecosystem: 'solana',
  },
];

// Rows agree with the catalog, with the chain named by its alias.
const agreeing: RegistryAsset[] = [
  { address: LBTC_SEPOLIA, asset_type: 'lbtc', chain: 'ethereum_sepolia' },
  { address: LBTC_BASE, asset_type: 'lbtc', chain: 'base_sepolia' },
  { address: BTCB_FUJI, asset_type: 'btcb', chain: 'avalanche_fuji' },
];

function compare(
  assets: RegistryAsset[],
  extra: { knownOmissions?: Record<string, string> } = {},
) {
  return compareRegistryToCatalog({
    env: Env.testnet,
    chains,
    assets,
    catalog,
    ...extra,
  });
}

describe('compareRegistryToCatalog', () => {
  const etherlinkFlag = featureConfig.isEtherlinkEnabled;
  afterEach(() => {
    featureConfig.isEtherlinkEnabled = etherlinkFlag;
  });

  it('finds nothing where the registry and the catalog agree', () => {
    const report = compare(agreeing);
    expect(report.failures).toEqual([]);
    expect(report.compared).toBe(3);
  });

  it('compares addresses without regard to case', () => {
    const report = compare([
      {
        ...agreeing[0],
        address: LBTC_SEPOLIA.toUpperCase().replace('0X', '0x'),
      },
      agreeing[1],
      agreeing[2],
    ]);
    expect(report.failures).toEqual([]);
  });

  it('fails on a deployment on a known chain that the catalog lacks', () => {
    const report = compare([
      ...agreeing,
      { address: BTCB_FUJI, asset_type: 'btcb', chain: 'base_sepolia' },
    ]);
    expect(report.failures).toEqual([
      `BTC.b on base (eip155:84532): registry lists ${BTCB_FUJI}, catalog has no deployment`,
    ]);
  });

  it('fails on a deployment the catalog holds at a different address', () => {
    const other = '0x9999999999999999999999999999999999999999';
    const report = compare([
      { ...agreeing[0], address: other },
      agreeing[1],
      agreeing[2],
    ]);
    expect(report.failures).toEqual([
      `LBTC on ethereum (eip155:11155111): registry lists ${other}, catalog has ${LBTC_SEPOLIA}`,
    ]);
  });

  it('accepts the bridge adapter or asset router as the registry address', () => {
    const report = compare([
      agreeing[0],
      { ...agreeing[1], address: LBTC_BASE_ROUTER },
      { ...agreeing[2], address: BTCB_FUJI_ADAPTER },
    ]);
    expect(report.failures).toEqual([]);
    expect(report.info.join('\n')).toContain('asset router');
    expect(report.info.join('\n')).toContain('bridge adapter');
  });

  it('reports, without failing, rows on chains the SDK lacks or retired, and non-EVM rows', () => {
    const report = compare([
      ...agreeing,
      { address: LBTC_SEPOLIA, asset_type: 'lbtc', chain: 'ink_sepolia' },
      { address: LBTC_SEPOLIA, asset_type: 'lbtc', chain: 'corn' },
      { address: 'So1anaAddress', asset_type: 'lbtc', chain: 'solana_devnet' },
      { address: LBTC_SEPOLIA, asset_type: 'lbtc', chain: 'unlisted' },
      { address: LBTC_SEPOLIA, asset_type: 'wbtc', chain: 'ethereum_sepolia' },
    ]);
    expect(report.failures).toEqual([]);
    expect(report.compared).toBe(3);
    const info = report.info.join('\n');
    expect(info).toContain('ink (eip155:57072)');
    expect(info).toContain('the SDK has no such chain');
    expect(info).toContain('corn (eip155:21000000)');
    expect(info).toContain('has retired this chain');
    expect(info).toContain('solana (solana): non-EVM');
    expect(info).toContain('"unlisted"');
    expect(info).toContain('asset type "wbtc"');
  });

  it('reports, without failing, a catalog deployment the registry does not list', () => {
    const report = compare([agreeing[0], agreeing[2]]);
    expect(report.failures).toEqual([]);
    expect(report.info.join('\n')).toContain(
      `LBTC on Base Sepolia (eip155:84532) at ${LBTC_BASE}: in the catalog, not in the registry`,
    );
  });

  it("does not read another environment's catalog entry as this one's", () => {
    // BSC is only in the prod entry above, so testnet must not report it.
    expect(compare(agreeing).info.join('\n')).not.toContain('eip155:56');
  });

  describe('a chain the catalog lists only behind a feature flag', () => {
    const row: RegistryAsset = {
      address: LBTC_SEPOLIA,
      asset_type: 'lbtc',
      chain: 'etherlink',
    };

    it('is information while the flag is off', () => {
      featureConfig.isEtherlinkEnabled = false;
      const report = compare([...agreeing, row]);
      expect(report.failures).toEqual([]);
      expect(report.info.join('\n')).toContain(
        'catalog has no deployment while isEtherlinkEnabled is off',
      );
    });

    it('fails once the flag is on and the catalog still lacks it', () => {
      featureConfig.isEtherlinkEnabled = true;
      expect(compare([...agreeing, row]).failures).toHaveLength(1);
    });
  });

  describe('known omissions', () => {
    // The catalog has no LBTC on Fuji, so this row is a failure unless named.
    const missing: RegistryAsset = {
      address: LBTC_SEPOLIA,
      asset_type: 'lbtc',
      chain: 'avalanche_fuji',
    };

    it('turn a matching failure into information with its reason', () => {
      const report = compare([...agreeing, missing], {
        knownOmissions: { 'LBTC eip155:43113': 'a documented omission' },
      });
      expect(report.failures).toEqual([]);
      expect(report.info.join('\n')).toContain(
        'accepted: a documented omission',
      );
    });

    it('are reported when they no longer match anything', () => {
      const report = compare(agreeing, {
        knownOmissions: { 'LBTC eip155:43113': 'a documented omission' },
      });
      expect(report.info.join('\n')).toContain(
        'accepted omission "LBTC eip155:43113" matches no registry row',
      );
    });

    it('do not hide a different address on the same chain', () => {
      const report = compare(
        [agreeing[0], { ...agreeing[1], address: LBTC_SEPOLIA }, agreeing[2]],
        { knownOmissions: { 'LBTC eip155:84532': 'documented' } },
      );
      expect(report.failures).toHaveLength(1);
    });
  });
});
