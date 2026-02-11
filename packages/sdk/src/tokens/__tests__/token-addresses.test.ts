/**
 * Token Addresses Tests
 *
 * Tests for token address retrieval functions including:
 * - EVM chain token addresses
 * - Sui chain token addresses
 * - Solana chain token addresses
 * - Starknet chain token addresses
 * - Bridge adapter addresses
 * - Environment-specific addresses
 */

import { Env } from '@lombard.finance/sdk-common';
import { describe, expect, it } from 'vitest';

import {
  ChainId,
  SOLANA_DEVNET_CHAIN,
  SOLANA_MAINNET_CHAIN,
  SOLANA_TESTNET_CHAIN,
  STARKNET_MAINNET_CHAIN,
  STARKNET_SEPOLIA_CHAIN,
  SUI_MAINNET_CHAIN,
  SUI_TESTNET_CHAIN,
} from '../../common/chains';
import { featureConfig } from '../../common/feature-config';
import {
  AddressKind,
  EVM_LBTC_ADDRESSES,
  getSolanaTokenAddress,
  getStarknetTokenAddress,
  getSuiTokenAddress,
  getTokenAddressForChain,
  getTokenByAddress,
  Token,
} from '../token-addresses';

describe('Token Addresses', () => {
  describe('getTokenAddressForChain', () => {
    describe('EVM Chains', () => {
      it('should return LBTC address for Ethereum mainnet in prod', () => {
        const address = getTokenAddressForChain(
          ChainId.ethereum,
          AddressKind.Token,
          Env.prod,
        );

        expect(address).toBe('0x8236a87084f8b84306f72007f36f2618a5634494');
        expect(address).toBeDefined();
        expect(typeof address).toBe('string');
      });

      it('should return LBTC address for Base in prod', () => {
        const address = getTokenAddressForChain(
          ChainId.base,
          AddressKind.Token,
          Env.prod,
        );

        expect(address).toBe('0xecAc9C5F704e954931349Da37F60E39f515c11c1');
        expect(address).toBeDefined();
      });

      it('should return LBTC address for Sepolia in testnet', () => {
        const address = getTokenAddressForChain(
          ChainId.sepolia,
          AddressKind.Token,
          Env.testnet,
        );

        expect(address).toBe('0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5');
        expect(address).toBeDefined();
      });

      it('should return undefined for chain without deployment', () => {
        // Sepolia is a testnet chain, so it has no prod deployment
        const address = getTokenAddressForChain(
          ChainId.sepolia,
          AddressKind.Token,
          Env.prod,
        );

        expect(address).toBeUndefined();
      });

      it('should return LBTC address for Avalanche Fuji in dev env', () => {
        // Note: getTokenAddressForChain only looks at LBTC token addresses
        // Bridge adapter addresses are for BTCb and not accessible via this function
        // Address availability depends on isAvalancheFujiEnabled feature flag
        const address = getTokenAddressForChain(
          ChainId.avalancheFuji,
          AddressKind.Token,
          Env.dev,
        );

        if (featureConfig.isAvalancheFujiEnabled) {
          expect(address).toBe('0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30');
          expect(address).toBeDefined();
        } else {
          // Avalanche Fuji is currently disabled via feature flag
          expect(address).toBeUndefined();
        }
      });

      it('should handle AddressKind parameter consistently', () => {
        // For chains with simple string addresses, AddressKind should not affect result
        const tokenAddress = getTokenAddressForChain(
          ChainId.ethereum,
          AddressKind.Token,
          Env.prod,
        );
        const adapterAddress = getTokenAddressForChain(
          ChainId.ethereum,
          AddressKind.Adapter,
          Env.prod,
        );

        // Both should return the same address since LBTC on Ethereum is a string
        expect(tokenAddress).toBe(adapterAddress);
        expect(tokenAddress).toBeDefined();
      });

      it('should use default AddressKind.Token when not specified', () => {
        const addressWithDefault = getTokenAddressForChain(
          ChainId.ethereum,
          undefined,
          Env.prod,
        );
        const addressWithExplicit = getTokenAddressForChain(
          ChainId.ethereum,
          AddressKind.Token,
          Env.prod,
        );

        expect(addressWithDefault).toBe(addressWithExplicit);
      });

      it('should return different addresses for different environments', () => {
        const prodAddress = getTokenAddressForChain(
          ChainId.sepolia,
          AddressKind.Token,
          Env.prod,
        );
        const testnetAddress = getTokenAddressForChain(
          ChainId.sepolia,
          AddressKind.Token,
          Env.testnet,
        );

        // Sepolia might not be in prod, but testnet should have it
        expect(testnetAddress).toBeDefined();
        if (prodAddress) {
          expect(prodAddress).not.toBe(testnetAddress);
        }
      });

      it('should handle all prod mainnet chains', () => {
        const prodChains = [
          ChainId.ethereum,
          ChainId.base,
          ChainId.binanceSmartChain,
          ChainId.sonic,
          ChainId.katana,
        ];

        for (const chainId of prodChains) {
          const address = getTokenAddressForChain(
            chainId,
            AddressKind.Token,
            Env.prod,
          );
          expect(address).toBeDefined();
          expect(typeof address).toBe('string');
          expect(address?.startsWith('0x')).toBe(true);
        }
      });

      it('should handle all testnet chains', () => {
        const testnetChains = [
          ChainId.sepolia,
          ChainId.holesky,
          ChainId.binanceSmartChainTestnet,
          ChainId.katanaTatara,
        ];

        for (const chainId of testnetChains) {
          const address = getTokenAddressForChain(
            chainId,
            AddressKind.Token,
            Env.testnet,
          );
          if (address !== undefined) {
            expect(typeof address).toBe('string');
            expect(address.startsWith('0x')).toBe(true);
          }
        }
      });
    });

    describe('Sui Chains', () => {
      it('should return LBTC address for Sui mainnet in prod', () => {
        const address = getTokenAddressForChain(
          SUI_MAINNET_CHAIN,
          AddressKind.Token,
          Env.prod,
        );

        expect(address).toBe(
          '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040',
        );
        expect(address).toBeDefined();
      });

      it('should return LBTC address for Sui testnet', () => {
        const testnetAddress = getTokenAddressForChain(
          SUI_TESTNET_CHAIN,
          AddressKind.Token,
          Env.testnet,
        );

        expect(testnetAddress).toBe(
          '0x50454d0b0fbad1288a6ab74f2e8ce0905a3317870673ab7787ebcf6f322b45fa',
        );
        expect(testnetAddress).toBeDefined();
      });

      it('should ignore AddressKind parameter for Sui chains', () => {
        // Sui chains don't have bridge adapters, so AddressKind should be ignored
        const tokenAddress = getTokenAddressForChain(
          SUI_MAINNET_CHAIN,
          AddressKind.Token,
          Env.prod,
        );
        const adapterAddress = getTokenAddressForChain(
          SUI_MAINNET_CHAIN,
          AddressKind.Adapter,
          Env.prod,
        );

        expect(tokenAddress).toBe(adapterAddress);
      });
    });

    describe('Solana Chains', () => {
      it('should return LBTC address for Solana mainnet in prod', () => {
        const address = getTokenAddressForChain(
          SOLANA_MAINNET_CHAIN,
          AddressKind.Token,
          Env.prod,
        );

        expect(address).toBe('LomP48F7bLbKyMRHHsDVt7wuHaUQvQnVVspjcbfuAek');
        expect(address).toBeDefined();
      });

      it('should return LBTC address for Solana testnet', () => {
        const address = getTokenAddressForChain(
          SOLANA_TESTNET_CHAIN,
          AddressKind.Token,
          Env.testnet,
        );

        expect(address).toBe('79cscM6J9Af24TGGWcXyDf56fDLoodkyXdVy4R9aZ6C6');
        expect(address).toBeDefined();
      });

      it('should return LBTC address for Solana devnet in stage', () => {
        const address = getTokenAddressForChain(
          SOLANA_DEVNET_CHAIN,
          AddressKind.Token,
          Env.stage,
        );

        expect(address).toBe('HEY7PCJe3GB27UWdopuYb1xDbB5SNtTcYPxRjntvfBSA');
        expect(address).toBeDefined();
      });

      it('should ignore AddressKind parameter for Solana chains', () => {
        const tokenAddress = getTokenAddressForChain(
          SOLANA_MAINNET_CHAIN,
          AddressKind.Token,
          Env.prod,
        );
        const adapterAddress = getTokenAddressForChain(
          SOLANA_MAINNET_CHAIN,
          AddressKind.Adapter,
          Env.prod,
        );

        expect(tokenAddress).toBe(adapterAddress);
      });
    });

    describe('Starknet Chains', () => {
      it('should return LBTC address for Starknet mainnet in prod', () => {
        const address = getTokenAddressForChain(
          STARKNET_MAINNET_CHAIN,
          AddressKind.Token,
          Env.prod,
        );

        expect(address).toBe(
          '0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4',
        );
        expect(address).toBeDefined();
      });

      it('should return LBTC address for Starknet Sepolia in testnet', () => {
        const address = getTokenAddressForChain(
          STARKNET_SEPOLIA_CHAIN,
          AddressKind.Token,
          Env.testnet,
        );

        expect(address).toBe(
          '0x00456a829ab75ba5e97534dc70d7fc617cfda244f8dcda47b11624de67c6e70c',
        );
        expect(address).toBeDefined();
      });

      it('should return undefined for Starknet chain without deployment', () => {
        const address = getTokenAddressForChain(
          STARKNET_MAINNET_CHAIN,
          AddressKind.Token,
          Env.testnet,
        );

        expect(address).toBeUndefined();
      });

      it('should ignore AddressKind parameter for Starknet chains', () => {
        const tokenAddress = getTokenAddressForChain(
          STARKNET_MAINNET_CHAIN,
          AddressKind.Token,
          Env.prod,
        );
        const adapterAddress = getTokenAddressForChain(
          STARKNET_MAINNET_CHAIN,
          AddressKind.Adapter,
          Env.prod,
        );

        expect(tokenAddress).toBe(adapterAddress);
      });
    });

    describe('Edge Cases', () => {
      it('should return undefined for invalid chain', () => {
        const address = getTokenAddressForChain(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
          'invalid-chain' as any,
          AddressKind.Token,
          Env.prod,
        );

        expect(address).toBeUndefined();
      });

      it('should handle undefined environment gracefully', () => {
        const address = getTokenAddressForChain(
          ChainId.ethereum,
          AddressKind.Token,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
          'non-existent' as any,
        );

        expect(address).toBeUndefined();
      });

      it('should return consistent results for multiple calls', () => {
        const address1 = getTokenAddressForChain(
          ChainId.ethereum,
          AddressKind.Token,
          Env.prod,
        );
        const address2 = getTokenAddressForChain(
          ChainId.ethereum,
          AddressKind.Token,
          Env.prod,
        );

        expect(address1).toBe(address2);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('getSuiTokenAddress', () => {
      it('should return Sui mainnet address', () => {
        const address = getSuiTokenAddress(SUI_MAINNET_CHAIN, Env.prod);

        expect(address).toBeDefined();
        expect(typeof address).toBe('string');
      });

      it('should use DEFAULT_ENV when env not provided', () => {
        const address = getSuiTokenAddress(SUI_MAINNET_CHAIN);

        expect(address).toBeDefined();
      });
    });

    describe('getSolanaTokenAddress', () => {
      it('should return Solana mainnet address', () => {
        const address = getSolanaTokenAddress(SOLANA_MAINNET_CHAIN, Env.prod);

        expect(address).toBeDefined();
        expect(typeof address).toBe('string');
      });

      it('should use DEFAULT_ENV when env not provided', () => {
        const address = getSolanaTokenAddress(SOLANA_MAINNET_CHAIN);

        expect(address).toBeDefined();
      });
    });

    describe('getStarknetTokenAddress', () => {
      it('should return Starknet mainnet token address', () => {
        const address = getStarknetTokenAddress(
          STARKNET_MAINNET_CHAIN,
          Env.prod,
          'token',
        );

        expect(address).toBeDefined();
        expect(typeof address).toBe('string');
      });

      it('should return Starknet mainnet asset router address', () => {
        const address = getStarknetTokenAddress(
          STARKNET_MAINNET_CHAIN,
          Env.prod,
          'assetRouter',
        );

        expect(address).toBeDefined();
        expect(typeof address).toBe('string');
      });

      it('should return different addresses for token vs assetRouter', () => {
        const tokenAddress = getStarknetTokenAddress(
          STARKNET_MAINNET_CHAIN,
          Env.prod,
          'token',
        );
        const routerAddress = getStarknetTokenAddress(
          STARKNET_MAINNET_CHAIN,
          Env.prod,
          'assetRouter',
        );

        expect(tokenAddress).not.toBe(routerAddress);
      });

      it('should use DEFAULT_ENV when env not provided', () => {
        // DEFAULT_ENV is prod, use mainnet which has prod deployment
        const address = getStarknetTokenAddress(STARKNET_MAINNET_CHAIN);

        expect(address).toBeDefined();
        expect(typeof address).toBe('string');
      });
    });

    describe('getTokenByAddress', () => {
      it('should identify LBTC on Ethereum', () => {
        const token = getTokenByAddress(
          '0x8236a87084f8b84306f72007f36f2618a5634494',
          ChainId.ethereum,
          Env.prod,
        );

        expect(token).toBe(Token.LBTC);
      });

      it('should be case-insensitive', () => {
        const token = getTokenByAddress(
          '0x8236A87084F8B84306F72007F36F2618A5634494', // Mixed case
          ChainId.ethereum,
          Env.prod,
        );

        expect(token).toBe(Token.LBTC);
      });

      it('should return undefined for unknown address', () => {
        const token = getTokenByAddress(
          '0x0000000000000000000000000000000000000000',
          ChainId.ethereum,
          Env.prod,
        );

        expect(token).toBeUndefined();
      });

      it('should return undefined when address is undefined', () => {
        const token = getTokenByAddress(undefined, ChainId.ethereum, Env.prod);

        expect(token).toBeUndefined();
      });

      it('should return undefined when chainId is undefined', () => {
        const token = getTokenByAddress(
          '0x8236a87084f8b84306f72007f36f2618a5634494',
          undefined,
          Env.prod,
        );

        expect(token).toBeUndefined();
      });
    });
  });

  describe('Data Consistency', () => {
    it('should have prod addresses for all prod environments', () => {
      const prodChains = Object.keys(EVM_LBTC_ADDRESSES[Env.prod] || {});

      expect(prodChains.length).toBeGreaterThan(0);
    });

    it('should have valid Ethereum addresses format', () => {
      const ethereumRegex = /^0x[a-fA-F0-9]{40}$/;
      const address = getTokenAddressForChain(
        ChainId.ethereum,
        AddressKind.Token,
        Env.prod,
      );

      if (address) {
        expect(ethereumRegex.test(address)).toBe(true);
      }
    });

    it('should have different addresses across different environments for same chain', () => {
      const addresses = new Set<string>();

      for (const env of [Env.prod, Env.testnet, Env.stage, Env.dev]) {
        const address = getTokenAddressForChain(
          ChainId.sepolia,
          AddressKind.Token,
          env,
        );
        if (address) {
          addresses.add(address);
        }
      }

      // Should have at least some variation across environments
      expect(addresses.size).toBeGreaterThan(1);
    });
  });
});
