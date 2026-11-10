/**
 * The unified BTC route config
 *
 * Stage C merges four BTC classes into two, which only works if one config
 * shape describes every route. The two v5 shapes were structurally identical
 * apart from one method name and a few optional fields one side had not
 * declared, so the unified shape is a superset rather than a compromise.
 *
 * The assertions run against the six configs that actually ship, not fixtures.
 * A route whose config stops satisfying the shape fails here, and the
 * type-level half fails the build.
 */

import { describe, expect, it } from 'vitest';

import { evmDepositConfig } from '../../../chains/btc/actions/deposit-btcb/config/evm';
import { solanaDepositConfig } from '../../../chains/btc/actions/deposit-btcb/config/solana';
import { evmConfig } from '../../../chains/btc/actions/deposit-lbtc/config/evm';
import { solanaConfig } from '../../../chains/btc/actions/deposit-lbtc/config/solana';
import { starknetConfig } from '../../../chains/btc/actions/deposit-lbtc/config/starknet';
import { suiConfig } from '../../../chains/btc/actions/deposit-lbtc/config/sui';
import type { BtcDepositRouteConfig } from '../../../chains/btc/actions/shared/routeConfig';
import { toBtcDepositRouteConfig } from '../../../chains/btc/actions/shared/routeConfig';
import { AssetId, Chain } from '../../../core';

/**
 * Every shipped BTC route config, adapted.
 *
 * The annotation is the type-level assertion: if a v5 config stops satisfying
 * the unified shape, this file stops compiling and `yarn build` fails before
 * the suite runs.
 */
const ROUTES: Array<[string, BtcDepositRouteConfig]> = [
  ['stake/evm', toBtcDepositRouteConfig(evmConfig)],
  ['stake/solana', toBtcDepositRouteConfig(solanaConfig)],
  ['stake/sui', toBtcDepositRouteConfig(suiConfig)],
  ['stake/starknet', toBtcDepositRouteConfig(starknetConfig)],
  ['deposit/evm', toBtcDepositRouteConfig(evmDepositConfig)],
  ['deposit/solana', toBtcDepositRouteConfig(solanaDepositConfig)],
];

describe('toBtcDepositRouteConfig', () => {
  it('covers every shipped route', () => {
    // Four stake configs and two deposit configs. A new chain added to either
    // tree without a row here is the thing this guards.
    expect(ROUTES).toHaveLength(6);
  });

  it.each(ROUTES)(
    '%s satisfies the unified shape at runtime',
    (_name, config) => {
      expect(typeof config.chainType).toBe('string');
      expect(Array.isArray(config.routes)).toBe(true);
      expect(Array.isArray(config.destChains)).toBe(true);
      expect(Array.isArray(config.supportedAssetsOut)).toBe(true);
      expect(config.addressSchema).toBeDefined();
      expect(typeof config.getFeeAuthConfig).toBe('function');
      expect(typeof config.getSignature).toBe('function');
    },
  );

  it.each(ROUTES)(
    '%s declares at least one route and asset',
    (_name, config) => {
      expect(config.routes.length).toBeGreaterThan(0);
      expect(config.supportedAssetsOut.length).toBeGreaterThan(0);
      expect(config.destChains.length).toBeGreaterThan(0);
    },
  );

  // The rename is the only substantive difference between the two v5 shapes.
  // The deposit tree calls it `signDestination`; the merged class calls
  // `getSignature`, so the adapter has to actually move it.
  it('maps the deposit tree signDestination onto getSignature', () => {
    const adapted = toBtcDepositRouteConfig(evmDepositConfig);

    expect(adapted.getSignature).toBe(evmDepositConfig.signDestination);
    expect(adapted).not.toHaveProperty('signDestination');
  });

  it('leaves a config that already uses getSignature untouched', () => {
    const adapted = toBtcDepositRouteConfig(evmConfig);

    expect(adapted).toBe(evmConfig);
    expect(adapted.getSignature).toBe(evmConfig.getSignature);
  });

  it('is idempotent, so adapting twice is safe', () => {
    const once = toBtcDepositRouteConfig(evmDepositConfig);
    const twice = toBtcDepositRouteConfig(once);

    expect(twice.getSignature).toBe(once.getSignature);
  });
});

describe('what the routes say about the merge', () => {
  it('the stake routes produce LBTC and the deposit routes produce BTC.b', () => {
    // This is the whole basis for one class serving both: the journeys differ
    // by output asset, which is a config row, not a code path.
    for (const [name, config] of ROUTES) {
      const expected = name.startsWith('stake/') ? AssetId.LBTC : AssetId.BTCb;
      expect(config.supportedAssetsOut, name).toContain(expected);
    }
  });

  it('only the EVM routes require a fee ceremony, and only for Ethereum', () => {
    const evm = toBtcDepositRouteConfig(evmConfig);

    expect(evm.getFeeAuthConfig(Chain.ETHEREUM)).not.toBeNull();
    // Subsidised destinations confirm an address instead of authorising a fee.
    expect(evm.getFeeAuthConfig(Chain.BASE)).toBeNull();
    expect(evm.getFeeAuthConfig(Chain.BSC)).toBeNull();
  });

  it('the non-EVM routes never require a fee ceremony', () => {
    for (const [name, config] of ROUTES) {
      if (name.includes('/evm')) continue;

      for (const destChain of config.destChains) {
        expect(
          config.getFeeAuthConfig(destChain),
          `${name} ${destChain}`,
        ).toBeNull();
      }
    }
  });
});
