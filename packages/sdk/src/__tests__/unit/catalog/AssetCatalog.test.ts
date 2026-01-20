/**
 * Asset Catalog Tests
 *
 * Tests to verify the ASSET_CATALOG has correct chain configurations.
 *
 * Related Issues:
 * - APP-1971: Fuji should be available for LBTC staking
 * - APP-1975: Holesky should NOT be available (deprecated)
 * - APP-1980: Berachain Bartio should NOT be available (not implemented)
 * - APP-1983: Base Sepolia should be available for BTC Stake
 *
 * @module __tests__/unit/catalog/AssetCatalog.test.ts
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import { featureConfig } from '../../../common/feature-config';
import { ASSET_CATALOG, AssetId, Chain, getAssetChains } from '../../../core';

describe('Asset Catalog', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // LBTC Deployments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('LBTC deployments', () => {
    describe('Testnet environment', () => {
      it('should include Avalanche Fuji (APP-1971)', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.testnet);
        expect(chains).toContain(Chain.AVALANCHE_FUJI);
      });

      it('should include Base Sepolia (APP-1983)', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.testnet);
        expect(chains).toContain(Chain.BASE_SEPOLIA);
      });

      it('should include Sepolia', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.testnet);
        expect(chains).toContain(Chain.SEPOLIA);
      });

      it('should NOT include Holesky (APP-1975 - deprecated)', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.testnet);
        // Holesky was removed from testnet
        expect(chains).not.toContain(Chain.HOLESKY);
      });

      it('should NOT include Berachain Bartio (APP-1980 - not implemented)', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.testnet);
        expect(chains).not.toContain(Chain.BERACHAIN_BARTIO);
      });

      it('should NOT include Sonic (APP-2009)', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.testnet);
        expect(chains).not.toContain(Chain.SONIC);
      });
    });

    describe('Stage environment', () => {
      it('should NOT include Avalanche Fuji (stage uses testnet only)', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.stage);
        expect(chains).not.toContain(Chain.AVALANCHE_FUJI);
      });

      it('should include Base Sepolia', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.stage);
        expect(chains).toContain(Chain.BASE_SEPOLIA);
      });

      it('should NOT include Holesky', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.stage);
        expect(chains).not.toContain(Chain.HOLESKY);
      });

      it('should NOT include Berachain Bartio', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.stage);
        expect(chains).not.toContain(Chain.BERACHAIN_BARTIO);
      });

      it('should NOT include Sonic (APP-2009)', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.stage);
        expect(chains).not.toContain(Chain.SONIC);
      });
    });

    describe('Production environment', () => {
      it('should include Ethereum mainnet', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.prod);
        expect(chains).toContain(Chain.ETHEREUM);
      });

      it('should include Base', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.prod);
        expect(chains).toContain(Chain.BASE);
      });

      it('should include Stable (APP-1970)', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.prod);
        expect(chains).toContain(Chain.STABLE);
      });

      it('should include Monad when enabled (APP-1970)', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.prod);
        if (featureConfig.isMonadEnabled) {
          expect(chains).toContain(Chain.MONAD);
        } else {
          expect(chains).not.toContain(Chain.MONAD);
        }
      });

      it('should NOT include any testnet chains', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.prod);
        expect(chains).not.toContain(Chain.SEPOLIA);
        expect(chains).not.toContain(Chain.HOLESKY);
        expect(chains).not.toContain(Chain.BASE_SEPOLIA);
        expect(chains).not.toContain(Chain.AVALANCHE_FUJI);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BTC.b Deployments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('BTC.b deployments', () => {
    it('should include Avalanche mainnet in production', () => {
      const chains = getAssetChains(AssetId.BTCb, Env.prod);
      expect(chains).toContain(Chain.AVALANCHE);
    });

    it('should include Stable in production (APP-1970)', () => {
      const chains = getAssetChains(AssetId.BTCb, Env.prod);
      expect(chains).toContain(Chain.STABLE);
    });

    it('should include Monad when enabled (APP-1970)', () => {
      const chains = getAssetChains(AssetId.BTCb, Env.prod);
      if (featureConfig.isMonadEnabled) {
        expect(chains).toContain(Chain.MONAD);
      } else {
        expect(chains).not.toContain(Chain.MONAD);
      }
    });

    it('should include Avalanche Fuji in testnet', () => {
      const chains = getAssetChains(AssetId.BTCb, Env.testnet);
      expect(chains).toContain(Chain.AVALANCHE_FUJI);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Catalog Structure
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Catalog structure', () => {
    it('should have a version string', () => {
      expect(ASSET_CATALOG.version).toBeDefined();
      expect(typeof ASSET_CATALOG.version).toBe('string');
    });

    it('should have LBTC asset defined', () => {
      expect(ASSET_CATALOG.assets[AssetId.LBTC]).toBeDefined();
    });

    it('should have BTCb asset defined', () => {
      expect(ASSET_CATALOG.assets[AssetId.BTCb]).toBeDefined();
    });

    it('should have correct decimals for LBTC', () => {
      expect(ASSET_CATALOG.assets[AssetId.LBTC]?.decimals).toBe(8);
    });

    it('should have correct decimals for BTC.b', () => {
      expect(ASSET_CATALOG.assets[AssetId.BTCb]?.decimals).toBe(8);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Regression Prevention
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Regression prevention', () => {
    it('testnet LBTC should have at least 3 chains', () => {
      const chains = getAssetChains(AssetId.LBTC, Env.testnet);
      expect(chains.length).toBeGreaterThanOrEqual(3);
    });

    it('stage LBTC should have at least 3 chains', () => {
      const chains = getAssetChains(AssetId.LBTC, Env.stage);
      expect(chains.length).toBeGreaterThanOrEqual(3);
    });

    it('production LBTC should have multiple chains', () => {
      const chains = getAssetChains(AssetId.LBTC, Env.prod);
      expect(chains.length).toBeGreaterThan(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // APP-1991: Unstaking chains should include Solana, Sui, and Fuji
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Unstaking chains availability (APP-1991)', () => {
    describe('Testnet environment', () => {
      it('should include Solana Testnet for LBTC unstaking', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.testnet);
        expect(chains).toContain(Chain.SOLANA_TESTNET);
      });

      it('should include Sui Testnet for LBTC unstaking', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.testnet);
        expect(chains).toContain(Chain.SUI_TESTNET);
      });

      it('should include Avalanche Fuji for LBTC unstaking', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.testnet);
        expect(chains).toContain(Chain.AVALANCHE_FUJI);
      });
    });

    describe('Stage environment', () => {
      it('should include Solana Devnet for LBTC unstaking', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.stage);
        expect(chains).toContain(Chain.SOLANA_DEVNET);
      });

      it('should include Sui Testnet for LBTC unstaking', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.stage);
        expect(chains).toContain(Chain.SUI_TESTNET);
      });

      it('should NOT include Avalanche Fuji for LBTC unstaking', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.stage);
        expect(chains).not.toContain(Chain.AVALANCHE_FUJI);
      });
    });

    describe('Production environment', () => {
      it('should include Solana Mainnet for LBTC unstaking', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.prod);
        expect(chains).toContain(Chain.SOLANA_MAINNET);
      });

      it('should include Sui Mainnet for LBTC unstaking', () => {
        const chains = getAssetChains(AssetId.LBTC, Env.prod);
        expect(chains).toContain(Chain.SUI_MAINNET);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // APP-1970: LBTC prod should include Monad and Stable networks
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Monad and Stable networks (APP-1970)', () => {
    it('should include Monad in LBTC production', () => {
      const chains = getAssetChains(AssetId.LBTC, Env.prod);
      expect(chains).toContain(Chain.MONAD);
    });

    it('should include Stable in LBTC production', () => {
      const chains = getAssetChains(AssetId.LBTC, Env.prod);
      expect(chains).toContain(Chain.STABLE);
    });

    it('should include Monad in BTC.b production', () => {
      const chains = getAssetChains(AssetId.BTCb, Env.prod);
      expect(chains).toContain(Chain.MONAD);
    });

    it('should include Stable in BTC.b production', () => {
      const chains = getAssetChains(AssetId.BTCb, Env.prod);
      expect(chains).toContain(Chain.STABLE);
    });
  });
});

describe('Asset Catalog Resolution', () => {
  it.skip('should fallback to bundled catalog on API failure', async () => {
    // Implementation pending: Asset Catalog is not yet implemented in SDK.
    // This test serves as a placeholder for when loadAssetCatalog is available.
    /*
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('API Down'));
    
    const catalog = await loadAssetCatalog({ env: Env.prod });
    
    expect(catalog).toBeDefined();
    expect(catalog.version).toBe(BUNDLED_CATALOG.version);
    */
  });
});

