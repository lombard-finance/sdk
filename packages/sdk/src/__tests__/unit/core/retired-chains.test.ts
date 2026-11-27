/**
 * Retired Chain Tests
 *
 * Corn and Swellchain no longer produce blocks. Their identifiers are kept as
 * deprecated aliases for one release so consumers upgrading within the 5.x
 * range still compile, but nothing in the SDK may route to them.
 *
 * Covers:
 * - the deprecated identifiers still resolve to their historical values
 * - retired chains are excluded from every chain listing
 * - catalog metadata is kept for labelling, without a (dead) explorer link
 * - no live config reaches a retired chain
 *
 * @module __tests__/unit/core/retired-chains.test.ts
 */

import { describe, expect, it } from 'vitest';

import {
  CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP,
  CHAIN_ID_TO_VIEM_CHAIN_MAP,
  ChainId,
  isValidChain,
  RETIRED_CHAIN_IDS,
} from '../../../common/chains';
import { featureConfig } from '../../../common/feature-config';
import { AssetId } from '../../../core/assets/types';
import {
  CHAIN_CATALOG,
  isRetiredChain,
  RETIRED_CHAINS,
} from '../../../core/chains/catalog';
import { Chain } from '../../../core/chains/types';
import {
  getChainsByType,
  getExplorerTxUrl,
  getMainnetChains,
  getTestnetChains,
  parseChainIdentifier,
} from '../../../core/chains/utils';

describe('retired chains', () => {
  describe('deprecated identifiers', () => {
    it('keeps the Corn identifiers at their historical values', () => {
      expect(ChainId.corn).toBe(21000000);
      expect(Chain.CORN).toBe('eip155:21000000');
      expect(AssetId.WBTCN).toBe('wBTCN');
    });

    it('keeps the Swellchain identifiers at their historical values', () => {
      expect(ChainId.swell).toBe(1923);
      expect(Chain.SWELL).toBe('eip155:1923');
    });

    it('keeps the feature flags as disabled no-ops', () => {
      expect(featureConfig.isCornEnabled).toBe(false);
      expect(featureConfig.isSwellchainEnabled).toBe(false);
    });
  });

  describe('registry', () => {
    it('marks both chains as retired', () => {
      expect(isRetiredChain(Chain.CORN)).toBe(true);
      expect(isRetiredChain(Chain.SWELL)).toBe(true);
      expect(RETIRED_CHAINS.size).toBe(2);
    });

    it('does not mark a live chain as retired', () => {
      expect(isRetiredChain(Chain.ETHEREUM)).toBe(false);
      expect(isRetiredChain(Chain.BASE)).toBe(false);
    });

    it('tracks the same two chains by numeric id', () => {
      expect([...RETIRED_CHAIN_IDS].sort()).toEqual(
        [ChainId.corn, ChainId.swell].sort(),
      );
    });
  });

  describe('runtime validation', () => {
    // The retired ids are still in Object.values(ChainId), so the guard has to
    // exclude them explicitly — otherwise it narrows a dead chain to ChainId.
    it('rejects retired ids', () => {
      expect(isValidChain(ChainId.corn)).toBe(false);
      expect(isValidChain(ChainId.swell)).toBe(false);
    });

    it('still accepts live ids', () => {
      expect(isValidChain(ChainId.ethereum)).toBe(true);
      expect(isValidChain(ChainId.base)).toBe(true);
    });

    it('refuses to parse a retired chain into a chain id', () => {
      expect(() => parseChainIdentifier(Chain.CORN)).toThrow(
        /Invalid EVM chain/,
      );
      expect(() => parseChainIdentifier(Chain.SWELL)).toThrow(
        /Invalid EVM chain/,
      );
      expect(parseChainIdentifier(Chain.BASE)).toBe(ChainId.base);
    });
  });

  describe('chain listings', () => {
    it('excludes retired chains from the mainnet list', () => {
      const mainnets = getMainnetChains();
      expect(mainnets).not.toContain(Chain.CORN);
      expect(mainnets).not.toContain(Chain.SWELL);
      expect(mainnets).toContain(Chain.ETHEREUM);
    });

    it('excludes retired chains from the testnet list', () => {
      const testnets = getTestnetChains();
      expect(testnets).not.toContain(Chain.CORN);
      expect(testnets).not.toContain(Chain.SWELL);
    });

    it('excludes retired chains from the EVM list', () => {
      const evmChains = getChainsByType('evm');
      expect(evmChains).not.toContain(Chain.CORN);
      expect(evmChains).not.toContain(Chain.SWELL);
      expect(evmChains).toContain(Chain.BASE);
    });
  });

  describe('catalog metadata', () => {
    it('keeps a name so historical activity can be labelled', () => {
      expect(CHAIN_CATALOG[Chain.CORN].name).toBe('Corn');
      expect(CHAIN_CATALOG[Chain.SWELL].name).toBe('Swell');
    });

    it('has no explorer link, since both explorers are offline', () => {
      expect(CHAIN_CATALOG[Chain.CORN].explorerUrl).toBeUndefined();
      expect(CHAIN_CATALOG[Chain.SWELL].explorerUrl).toBeUndefined();
      expect(getExplorerTxUrl(Chain.CORN, '0xabc')).toBeUndefined();
      expect(getExplorerTxUrl(Chain.SWELL, '0xabc')).toBeUndefined();
    });
  });

  describe('routing', () => {
    it('has no viem chain, so no client can be built', () => {
      const viemChains = CHAIN_ID_TO_VIEM_CHAIN_MAP as Record<number, unknown>;
      expect(viemChains[ChainId.corn]).toBeUndefined();
      expect(viemChains[ChainId.swell]).toBeUndefined();
    });

    it('has no DefiLlama chain name', () => {
      const llamaNames = CHAIN_ID_TO_LLAMA_CHAIN_NAME_MAP as Record<
        number,
        string | undefined
      >;
      expect(llamaNames[ChainId.corn]).toBeUndefined();
      expect(llamaNames[ChainId.swell]).toBeUndefined();
    });
  });
});
