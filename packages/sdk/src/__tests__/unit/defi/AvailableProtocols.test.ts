/**
 * Tests for getAvailableProtocols and getAvailableProtocolsWithMetadata
 *
 * These functions filter DeFi protocols based on environment and asset,
 * using the DEFI_REGISTRY as the source of truth.
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { AssetId } from '../../../core/assets';
import {
  DefiProtocol,
  getAvailableProtocols,
  getAvailableProtocolsWithMetadata,
} from '../../../defi/defi-registry';

describe('getAvailableProtocols', () => {
  describe('LBTC protocols', () => {
    it('should return Veda for LBTC in prod', () => {
      const protocols = getAvailableProtocols(AssetId.LBTC, Env.prod);

      expect(protocols).toContain(DefiProtocol.Veda);
      // Silo is only on Avalanche which has no mainnet prod config in DEFI_REGISTRY
      expect(protocols).not.toContain(DefiProtocol.Silo);
      // OnChainCredit's BTC route stakes BTC.b, so it does not produce LBTC
      expect(protocols).not.toContain(DefiProtocol.OnChainCredit);
    });

    it('should return Veda for LBTC in testnet', () => {
      const protocols = getAvailableProtocols(AssetId.LBTC, Env.testnet);

      expect(protocols).toContain(DefiProtocol.Veda);
    });

    it('should return Veda for LBTC in stage', () => {
      const protocols = getAvailableProtocols(AssetId.LBTC, Env.stage);

      expect(protocols).toContain(DefiProtocol.Veda);
    });
  });

  describe('BTCb protocols', () => {
    it('should NOT return Silo for BTCb in prod (Avalanche mainnet not enabled)', () => {
      const protocols = getAvailableProtocols(AssetId.BTCb, Env.prod);

      // Silo for BTCb is only configured for Env.testnet in DEFI_REGISTRY
      expect(protocols).not.toContain(DefiProtocol.Silo);
    });

    it('should return Silo for BTCb in testnet (Avalanche Fuji enabled)', () => {
      const protocols = getAvailableProtocols(AssetId.BTCb, Env.testnet);

      expect(protocols).toContain(DefiProtocol.Silo);
    });

    it('should NOT return Silo for BTCb in stage (not configured)', () => {
      const protocols = getAvailableProtocols(AssetId.BTCb, Env.stage);

      // DEFI_REGISTRY only has Silo BTCb config for testnet, not stage
      expect(protocols).not.toContain(DefiProtocol.Silo);
    });
  });

  describe('BTC protocols', () => {
    it('should return Veda and OnChainCredit for BTC in prod', () => {
      const protocols = getAvailableProtocols(AssetId.BTC, Env.prod);

      expect(protocols).toEqual(
        expect.arrayContaining([DefiProtocol.Veda, DefiProtocol.OnChainCredit]),
      );
    });

    it('should not return OnChainCredit outside prod', () => {
      for (const env of [Env.stage, Env.testnet, Env.dev]) {
        expect(getAvailableProtocols(AssetId.BTC, env)).not.toContain(
          DefiProtocol.OnChainCredit,
        );
      }
    });
  });

  describe('unsupported assets', () => {
    it('should return empty array for unsupported asset', () => {
      // Using a made-up asset ID that's not in the registry
      const protocols = getAvailableProtocols(
        'unsupported' as AssetId,
        Env.prod,
      );

      expect(protocols).toEqual([]);
    });
  });
});

describe('getAvailableProtocolsWithMetadata', () => {
  it('should return protocol metadata for LBTC in prod', () => {
    const protocols = getAvailableProtocolsWithMetadata(AssetId.LBTC, Env.prod);

    expect(protocols.length).toBeGreaterThan(0);

    const veda = protocols.find((p) => p.value === DefiProtocol.Veda);
    expect(veda).toBeDefined();
    expect(veda?.label).toBe('Lombard DeFi Vault');
    expect(veda?.url).toBe('https://lombard.finance');
  });

  it('should return Silo metadata for BTCb in testnet', () => {
    const protocols = getAvailableProtocolsWithMetadata(
      AssetId.BTCb,
      Env.testnet,
    );

    const silo = protocols.find((p) => p.value === DefiProtocol.Silo);
    expect(silo).toBeDefined();
    expect(silo?.label).toBe('Silo Finance Vault');
    expect(silo?.url).toBe('https://silo.finance');
  });

  it('should return only OnChainCredit for BTCb in prod', () => {
    const protocols = getAvailableProtocolsWithMetadata(AssetId.BTCb, Env.prod);

    expect(protocols).toEqual([
      {
        value: DefiProtocol.OnChainCredit,
        label: 'Bitcoin On-Chain Credit',
        url: 'https://lombard.finance',
      },
    ]);
  });

  it('should return empty array when no protocols available', () => {
    // BTCb in stage has no protocols (Silo is testnet-only, OnChainCredit prod-only)
    const protocols = getAvailableProtocolsWithMetadata(
      AssetId.BTCb,
      Env.stage,
    );

    expect(protocols).toEqual([]);
  });
});
