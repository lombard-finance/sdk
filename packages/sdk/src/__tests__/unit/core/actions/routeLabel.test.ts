/**
 * Route labels
 *
 * After the merges one class covers several journeys — `BtcDepositBtcb` covers four
 * and `EvmWithdrawVault` two — so `constructor.name` no longer identifies what
 * failed. `LogMeta` carries `route` into `toSentryContext()` instead, which
 * means a wrong label is a wrong answer in a log line during exactly the window
 * partners are filing migration bugs.
 *
 * So the label is derived from the parameters rather than declared per class,
 * and an unknown combination throws instead of guessing.
 */

import { describe, expect, it } from 'vitest';

import type { RouteLabel } from '../../../../core/actions';
import { deriveRouteLabel, vaultAsset } from '../../../../core/actions';
import { AssetId } from '../../../../core/assets/types';
import { DEFI_REGISTRY, DefiProtocol } from '../../../../defi';

describe('deriveRouteLabel', () => {
  it.each([
    [AssetId.BTC, AssetId.LBTC, 'btc-to-lbtc'],
    [AssetId.BTC, AssetId.BTCb, 'btc-to-btcb'],
    [AssetId.BTCb, AssetId.LBTC, 'btcb-to-lbtc'],
    [AssetId.BTCb, AssetId.BTC, 'btcb-to-btc'],
    [AssetId.LBTC, AssetId.BTC, 'lbtc-to-btc'],
    [AssetId.LBTC, AssetId.BTCb, 'lbtc-to-btcb'],
  ])('labels %s to %s as %s', (assetIn, assetOut, expected) => {
    expect(deriveRouteLabel({ assetIn, assetOut })).toBe(expected);
  });

  it.each([
    [AssetId.BTC, 'btc-to-vault'],
    [AssetId.LBTC, 'lbtc-to-vault'],
    [AssetId.BTCb, 'btcb-to-vault'],
  ])('labels a deploy of %s as %s', (assetIn, expected) => {
    expect(deriveRouteLabel({ assetIn, protocol: DefiProtocol.Veda })).toBe(
      expected,
    );
  });

  it.each([
    [AssetId.LBTC, 'vault-to-lbtc'],
    [AssetId.BTCb, 'vault-to-btcb'],
  ])('labels a vault exit to %s as %s', (assetOut, expected) => {
    expect(deriveRouteLabel({ assetOut, protocol: DefiProtocol.Veda })).toBe(
      expected,
    );
  });

  // A vault route names only the non-vault side, because the share token has no
  // AssetId. Which side is present is what says whether it is an entry or exit.
  it('distinguishes a vault entry from an exit by which side is named', () => {
    expect(
      deriveRouteLabel({
        assetIn: AssetId.LBTC,
        protocol: DefiProtocol.Veda,
      }),
    ).toBe('lbtc-to-vault');
    expect(
      deriveRouteLabel({
        assetOut: AssetId.LBTC,
        protocol: DefiProtocol.Veda,
      }),
    ).toBe('vault-to-lbtc');
  });

  it('throws rather than guessing when it cannot label a combination', () => {
    // A label appears in a log as fact. Inventing one is worse than failing.
    expect(() => deriveRouteLabel({})).toThrow(/No route label/);
    expect(() => deriveRouteLabel({ assetIn: AssetId.BTC })).toThrow(
      /No route label/,
    );
    expect(() =>
      deriveRouteLabel({ assetIn: AssetId.WBTC, assetOut: AssetId.LBTC }),
    ).toThrow(/No route label/);
  });

  it('says what it was given, so the failure is diagnosable', () => {
    expect(() => deriveRouteLabel({ assetIn: AssetId.WBTC })).toThrow(/WBTC/);
  });
});

describe('vaultAsset', () => {
  it('reads the asset a protocol holds out of the registry', () => {
    // Not restated here: a protocol added to DEFI_REGISTRY is labelled without
    // a second edit.
    expect(vaultAsset(DefiProtocol.Veda)).toBe(AssetId.LBTC);
    expect(vaultAsset(DefiProtocol.Silo)).toBe(AssetId.BTCb);
  });

  it('skips the virtual BTC key, which names an input rather than a holding', () => {
    // Veda carries both a real LBTC key and the synthetic 'BTC' one used for
    // ratio conversion. The vault holds LBTC.
    expect(Object.keys(DEFI_REGISTRY[DefiProtocol.Veda])).toContain('BTC');
    expect(vaultAsset(DefiProtocol.Veda)).not.toBe(AssetId.BTC);
  });

  it('throws for a protocol with no registry entry', () => {
    expect(() => vaultAsset('not-a-protocol')).toThrow(/No vault asset/);
  });

  it('covers every protocol the registry declares', () => {
    for (const protocol of Object.keys(DEFI_REGISTRY)) {
      expect(() => vaultAsset(protocol), protocol).not.toThrow();
    }
  });
});

describe('the label vocabulary', () => {
  it('only produces labels the RouteLabel union declares', () => {
    // The cast is what this asserts against: every derivation below has to be
    // assignable, so adding a route without extending RouteLabel fails to
    // compile rather than emitting an unknown string.
    const produced: RouteLabel[] = [
      deriveRouteLabel({ assetIn: AssetId.BTC, assetOut: AssetId.LBTC }),
      deriveRouteLabel({ assetIn: AssetId.BTC, protocol: DefiProtocol.Veda }),
      deriveRouteLabel({
        assetOut: vaultAsset(DefiProtocol.Silo),
        protocol: DefiProtocol.Silo,
      }),
    ];

    expect(produced).toEqual(['btc-to-lbtc', 'btc-to-vault', 'vault-to-btcb']);
  });
});
