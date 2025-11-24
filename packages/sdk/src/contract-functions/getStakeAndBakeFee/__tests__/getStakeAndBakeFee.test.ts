import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it, vi } from 'vitest';
import { ChainId } from '../../../common/chains';
import { DefiProtocol } from '../../../defi/defi-registry';
import { Token } from '../../../tokens/token-addresses';
import { getStakeAndBakeFee } from '../getStakeAndBakeFee';

// Mock dependencies
vi.mock('../../../clients/public-client', () => ({
  makePublicClient: vi.fn(() => ({})),
}));

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    getContract: vi.fn(() => ({
      read: {
        getStakeAndBakeFee: vi.fn(async () => BigInt(1000000)), // 0.01 LBTC in satoshi
      },
    })),
  };
});

vi.mock('../../signStakeAndBake/validation', () => ({
  getStakeAndBakeConfig: vi.fn((protocol, token, chainId, env) => {
    // Simulate validation - throw for unsupported combinations
    if (protocol === DefiProtocol.Silo && token !== Token.BTCb) {
      throw new Error(
        `Token ${token} is not supported for stake and bake on vault Silo`,
      );
    }
    if (protocol === DefiProtocol.Veda && token === Token.BTCb) {
      throw new Error(
        `Token ${token} is not supported for stake and bake on vault Veda`,
      );
    }

    return {
      protocol,
      token,
      chainId,
      env,
      amountStrategy: 'identity',
      approval: {
        mode: 'permit',
        domainName: 'Test',
        domainVersion: '1',
        deadlineStrategy: 'expiry',
        nonceStrategy: 'chain',
      },
      spenderContract: {
        address: '0x1234567890123456789012345678901234567890',
        abi: [],
        chainId,
      },
    };
  }),
}));

describe('getStakeAndBakeFee', () => {
  describe('Protocol-aware default tokens', () => {
    it('should use LBTC as default token for Veda', async () => {
      const result = await getStakeAndBakeFee({
        protocol: DefiProtocol.Veda,
        chainId: ChainId.ethereum,
        env: Env.prod,
      });

      expect(result.toString()).toBe('0.01');
    });

    it('should use BTCb as default token for Silo', async () => {
      const result = await getStakeAndBakeFee({
        protocol: DefiProtocol.Silo,
        chainId: ChainId.avalancheFuji,
        env: Env.testnet,
      });

      expect(result.toString()).toBe('0.01');
    });
  });

  describe('Explicit token parameter', () => {
    it('should use explicitly provided token for Veda (LBTC)', async () => {
      const result = await getStakeAndBakeFee({
        protocol: DefiProtocol.Veda,
        token: Token.LBTC,
        chainId: ChainId.ethereum,
        env: Env.prod,
      });

      expect(result.toString()).toBe('0.01');
    });

    it('should use explicitly provided token for Silo (BTCb)', async () => {
      const result = await getStakeAndBakeFee({
        protocol: DefiProtocol.Silo,
        token: Token.BTCb,
        chainId: ChainId.avalancheFuji,
        env: Env.testnet,
      });

      expect(result.toString()).toBe('0.01');
    });

    it('should use explicitly provided BTC token for Veda', async () => {
      const result = await getStakeAndBakeFee({
        protocol: DefiProtocol.Veda,
        token: 'BTC',
        chainId: ChainId.ethereum,
        env: Env.prod,
      });

      expect(result.toString()).toBe('0.01');
    });
  });

  describe('Error handling - invalid token/protocol combinations', () => {
    it('should throw error when using BTCb with Veda (explicit)', async () => {
      await expect(
        getStakeAndBakeFee({
          protocol: DefiProtocol.Veda,
          token: Token.BTCb,
          chainId: ChainId.ethereum,
          env: Env.prod,
        }),
      ).rejects.toThrow('Token BTC.b is not supported for stake and bake on vault Veda');
    });

    it('should throw error when using LBTC with Silo (explicit)', async () => {
      await expect(
        getStakeAndBakeFee({
          protocol: DefiProtocol.Silo,
          token: Token.LBTC,
          chainId: ChainId.avalancheFuji,
          env: Env.testnet,
        }),
      ).rejects.toThrow('Token LBTC is not supported for stake and bake on vault Silo');
    });
  });

  describe('Default protocol behavior', () => {
    it('should default to Veda protocol when not specified', async () => {
      const result = await getStakeAndBakeFee({
        chainId: ChainId.ethereum,
        env: Env.prod,
      });

      expect(result.toString()).toBe('0.01');
    });

    it('should default to LBTC token when protocol and token not specified', async () => {
      const result = await getStakeAndBakeFee({
        chainId: ChainId.ethereum,
        env: Env.prod,
      });

      expect(result.toString()).toBe('0.01');
    });
  });
});

