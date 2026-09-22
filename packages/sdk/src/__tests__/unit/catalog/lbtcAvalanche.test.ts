/**
 * The catalog and the address table agree about Avalanche
 *
 * `EVM_LBTC_ADDRESSES` has carried a production LBTC address on Avalanche with
 * its feature flag on, while the asset catalog did not list the chain — so
 * `getAllAssetChains(AssetId.LBTC)` omitted it and every destination list built
 * from the catalog offered Avalanche for BTC.b and not for LBTC, on a chain
 * where both are deployed.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { ChainId } from '../../../common/chains';
import { featureConfig } from '../../../common/feature-config';
import { getAssetChains } from '../../../core/assets';
import { AssetId } from '../../../core/assets/types';
import { Chain } from '../../../core/chains';
import { EVM_LBTC_ADDRESSES } from '../../../tokens/token-addresses';

describe('LBTC on Avalanche', () => {
  it('is offered wherever it has an address', () => {
    const hasAddress =
      EVM_LBTC_ADDRESSES[Env.prod]?.[ChainId.avalanche] !== undefined;
    const inCatalog = getAssetChains(AssetId.LBTC, Env.prod).includes(
      Chain.AVALANCHE,
    );

    // Stated as an equality rather than two assertions: the defect was the two
    // disagreeing, so either direction is a bug. An address with no catalog
    // entry hides a working chain; a catalog entry with no address would offer
    // a destination that cannot be resolved.
    expect(inCatalog).toBe(hasAddress);
  });

  it('tracks the feature flag both places', () => {
    const inCatalog = getAssetChains(AssetId.LBTC, Env.prod).includes(
      Chain.AVALANCHE,
    );

    expect(inCatalog).toBe(featureConfig.isAvalancheMainnetEnabled);
  });

  it('is not offered on stage, where the testnet equivalent is Fuji', () => {
    expect(getAssetChains(AssetId.LBTC, Env.stage)).not.toContain(
      Chain.AVALANCHE,
    );
  });
});
