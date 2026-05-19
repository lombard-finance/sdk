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

    it('should return Veda for BTCb in prod (Ethereum)', () => {
      const protocols = getAvailableProtocols(AssetId.BTCb, Env.prod);

      // Veda + BTC.b deposit-and-deploy on Ethereum mainnet was added
      // alongside the StakeAndBakeNativeToken contract.
      expect(protocols).toContain(DefiProtocol.Veda);
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

  it('should return Veda metadata for BTCb in prod', () => {
    // Veda BTC.b deposit-and-deploy is now configured on Ethereum prod.
    const protocols = getAvailableProtocolsWithMetadata(AssetId.BTCb, Env.prod);

    const veda = protocols.find((p) => p.value === DefiProtocol.Veda);
    expect(veda).toBeDefined();
    expect(veda?.label).toBe('Lombard DeFi Vault');
    expect(veda?.url).toBe('https://lombard.finance');
  });

  it('should return empty array for an unconfigured asset+env', () => {
    const protocols = getAvailableProtocolsWithMetadata(
      'unsupported' as AssetId,
      Env.prod,
    );

    expect(protocols).toEqual([]);
  });
});
