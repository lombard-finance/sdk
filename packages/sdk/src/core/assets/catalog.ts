/**
 * Asset Catalog
 *
 * Central registry of all assets and their deployments.
 * JSON-serializable for S3 hosting.
 *
 * @module core/assets/catalog
 */

import { Env } from '@lombard.finance/sdk-common';

import { featureConfig } from '../../common/feature-config';
import { Chain } from '../chains';
import { AssetCatalog, AssetId } from './types';

export const ASSET_CATALOG: AssetCatalog = {
  version: '1.0.0',

  assets: {
    // ═══════════════════════════════════════════════════════════════════════
    // LBTC - Lombard BTC
    // ═══════════════════════════════════════════════════════════════════════
    [AssetId.LBTC]: {
      decimals: 8,
      symbol: 'LBTC',
      name: 'Lombard BTC',
      deployments: [
        // Production
        {
          env: Env.prod,
          chain: Chain.ETHEREUM,
          address: '0x8236a87084f8b84306f72007f36f2618a5634494',
        },
        {
          env: Env.prod,
          chains: [
            Chain.BASE,
            Chain.BSC,
            Chain.BERACHAIN,
            Chain.CORN, // Supported for EVM Deploy (Veda), not for BTC Stake
            ...(featureConfig.isEtherlinkEnabled ? [Chain.ETHERLINK] : []),
            Chain.KATANA,
            Chain.MORPH,
            Chain.SONIC,
            Chain.SWELL,
            Chain.TAC,
            ...(featureConfig.isMonadEnabled ? [Chain.MONAD] : []),
            Chain.STABLE,
          ],
          address: '0xecAc9C5F704e954931349Da37F60E39f515c11c1',
        },
        {
          env: Env.prod,
          chain: Chain.BOB,
          address: '0xA45d4121b3D47719FF57a947A9d961539Ba33204',
        },
        {
          env: Env.prod,
          chain: Chain.SOLANA_MAINNET,
          address: 'LomP48F7bLbKyMRHHsDVt7wuHaUQvQnVVspjcbfuAek',
        },
        {
          env: Env.prod,
          chain: Chain.SUI_MAINNET,
          address:
            '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040',
        },
        {
          env: Env.prod,
          chain: Chain.STARKNET_MAINNET,
          address:
            '0x036834a40984312f7f7de8d31e3f6305b325389eaeea5b1c0664b2fb936461a4',
          assetRouter:
            '0x05b1886d0f844ab930fc0ee066f1655a873437f15a5d2c41ee3e884fd5299976',
        },

        // Testnet
        {
          env: Env.testnet,
          chain: Chain.SEPOLIA,
          address: '0xc47e4b3124597fdf8dd07843d4a7052f2ee80c30',
        },
        {
          env: Env.testnet,
          chains: [
            Chain.AVALANCHE_FUJI,
            Chain.BASE_SEPOLIA,
            Chain.BSC_TESTNET,
          ],
          address: '0x107Fc7d90484534704dD2A9e24c7BD45DB4dD1B5',
        },
        {
          env: Env.testnet,
          chain: Chain.SOLANA_TESTNET,
          address: '79cscM6J9Af24TGGWcXyDf56fDLoodkyXdVy4R9aZ6C6',
        },
        {
          env: Env.testnet,
          chain: Chain.SUI_TESTNET,
          address:
            '0x50454d0b0fbad1288a6ab74f2e8ce0905a3317870673ab7787ebcf6f322b45fa',
        },
        {
          env: Env.testnet,
          chain: Chain.STARKNET_SEPOLIA,
          address:
            '0x00456a829ab75ba5e97534dc70d7fc617cfda244f8dcda47b11624de67c6e70c',
          assetRouter:
            '0x063b7b5c8b114ebd5b9602fbd5d0ffd2cc3a598f1d91c6904cc0997cd8fea760',
        },

        // Stage
        // Note: Avalanche Fuji is only supported on testnet (Gastald), not stage
        {
          env: Env.stage,
          chains: [
            Chain.BASE_SEPOLIA,
            Chain.BSC_TESTNET,
            Chain.SEPOLIA,
          ],
          address: '0x731eFa688F3679688cf60A3993b8658138953ED6',
        },
        {
          env: Env.dev,
          chain: Chain.SOLANA_DEVNET,
          address: 'LBTCojyVJ63rsEED2DLEGWMzSxWJyQynXE91LMLgV1J',
        },
        {
          env: Env.stage,
          chain: Chain.SUI_TESTNET,
          address:
            '0x2d66430a27565b912f21be970e5ae1e8c0359f0b518c3235b751c75976791ce0',
        },
        {
          env: Env.stage,
          chain: Chain.STARKNET_SEPOLIA,
          address:
            '0x00b442f5420860e937a99659326e81a97e07bfd538b3cee65b90029c9da38a5f',
          assetRouter:
            '0x01d27f156092746d0d7cd9d9deec5e937f27c3c7c1c28365e9e5efac459880b3',
        },

        // Dev
        {
          env: Env.dev,
          chain: Chain.SEPOLIA,
          address: '0x93283b6B889C591893dB0dc93baD71656D5d8923',
        },
        {
          env: Env.dev,
          chains: [
            Chain.AVALANCHE_FUJI,
            Chain.BASE_SEPOLIA,
            Chain.BERACHAIN_BARTIO,
            Chain.BSC_TESTNET,
          ],
          address: '0xc47e4b3124597FDF8DD07843D4a7052F2eE80C30',
        },
        {
          env: Env.dev,
          chain: Chain.STARKNET_SEPOLIA,
          address:
            '0x0723de0c550b7bfbb5051dade72966d71a08bef952c0197462a5244497eb57c1',
          assetRouter:
            '0x04838a05c798dc57e01e85526979841c84f1f3c732a525cff53adb3e8bee3d24',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BTC.b - Lombard's Native BTC Wrapper
    // ═══════════════════════════════════════════════════════════════════════
    [AssetId.BTCb]: {
      decimals: 8,
      symbol: 'BTC.b',
      name: 'BTC.b',
      deployments: [
        // Production
        {
          env: Env.prod,
          chains: [
            Chain.KATANA,
            Chain.MEGAETH,
            ...(featureConfig.isMonadEnabled ? [Chain.MONAD] : []),
            Chain.STABLE,
          ],
          address: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
        },
        {
          env: Env.prod,
          chain: Chain.AVALANCHE,
          address: '0x152b9d0FdC40C096757F570A51E494bd4b943E50',
          bridgeAdapter: '0x85D1D52e11290F174444d21C2a167bEDBE36e4d2',
        },

        // Testnet
        {
          env: Env.testnet,
          chain: Chain.SEPOLIA,
          address: '0x20eA7b8ABb4B583788F1DFC738C709a2d9675681',
        },
        {
          env: Env.testnet,
          chain: Chain.AVALANCHE_FUJI,
          address: '0x7FbdC44BfEBDe80C970ba622B678daB36cee31f6',
          bridgeAdapter: '0x0A65C37d07c32E5eA8ea40495b7f249cdE26935e',
        },

        // Stage
        // Note: Avalanche Fuji is only supported on testnet (Gastald), not stage
        {
          env: Env.stage,
          chain: Chain.SEPOLIA,
          address: '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58',
        },
        {
          env: Env.dev,
          chain: Chain.SOLANA_DEVNET,
          address: 'BTCB1BeSVzjtde2pqpNFCPbwQXpZd1ERwtToDreTdqr1',
        },

        // Dev
        {
          env: Env.dev,
          chain: Chain.SEPOLIA,
          address: '0x195219A262423d209E126BD21cf4F4F9AA796927',
        },
        {
          env: Env.dev,
          chain: Chain.BSC_TESTNET,
          address: '0xea3F66E5f2928dB9673103BfA01a2153A57a8050',
        },
        {
          env: Env.dev,
          chain: Chain.AVALANCHE_FUJI,
          address: '0x7FbdC44BfEBDe80C970ba622B678daB36cee31f6',
          bridgeAdapter: '0x0A65C37d07c32E5eA8ea40495b7f249cdE26935e',
        },

        // IBC
        {
          env: Env.ibc,
          chain: Chain.AVALANCHE_FUJI,
          address: '0x71ba2b8dc58e7ca1b6d81a60729e31aefa37ae02',
          bridgeAdapter: '0x1391f9AC408cf13214DDB71d359002658eaF9ebb',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // BTCBinance (BTCB) - Binance-Peg BTCB
    // ═══════════════════════════════════════════════════════════════════════
    [AssetId.BTCBinance]: {
      decimals: 18,
      symbol: 'BTCB',
      name: 'Binance-Peg BTCB',
      deployments: [
        {
          env: Env.prod,
          chain: Chain.BSC,
          address: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
          publicMarketMaker: '0xE4ff44a615dF38e37cdF475833c1d57774CC9D4A',
        },
        {
          env: Env.testnet,
          chain: Chain.BSC_TESTNET,
          address: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
          publicMarketMaker: '0x63749Acfc2527A8406E8BC8c93A80f29FDD75e27',
        },
        {
          env: Env.stage,
          chain: Chain.BSC_TESTNET,
          address: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
          publicMarketMaker: '0x440362b55D4a255EBA3c27C650d2dC1a91Db85bA',
        },
        {
          env: Env.dev,
          chain: Chain.BSC_TESTNET,
          address: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
          publicMarketMaker: '0x440362b55D4a255EBA3c27C650d2dC1a91Db85bA',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // cbBTC - Coinbase Wrapped BTC
    // ═══════════════════════════════════════════════════════════════════════
    [AssetId.cbBTC]: {
      decimals: 8,
      symbol: 'cbBTC',
      name: 'Coinbase Wrapped BTC',
      deployments: [
        {
          env: Env.prod,
          chains: [Chain.ETHEREUM, Chain.BASE],
          address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
          publicMarketMaker: '0x92c01FC0F59857c6E920EdFf1139904b2Bb74c7c',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // eBTC
    // ═══════════════════════════════════════════════════════════════════════
    [AssetId.eBTC]: {
      decimals: 8,
      symbol: 'eBTC',
      deployments: [
        {
          env: Env.prod,
          chain: Chain.ETHEREUM,
          address: '0x657e8c867d8b37dcc18fa4caead9c45eb088c642',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // WBTC - Wrapped BTC
    // ═══════════════════════════════════════════════════════════════════════
    [AssetId.WBTC]: {
      decimals: 8,
      symbol: 'WBTC',
      deployments: [
        {
          env: Env.prod,
          chain: Chain.ETHEREUM,
          address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // wBTCN - Wrapped BTCN on Corn
    // ═══════════════════════════════════════════════════════════════════════
    [AssetId.WBTCN]: {
      decimals: 8,
      symbol: 'wBTCN',
      deployments: [
        {
          env: Env.prod,
          chain: Chain.CORN,
          address: '0xda5dDd7270381A7C2717aD10D1c0ecB19e3CDFb2',
        },
      ],
    },
  },
};
