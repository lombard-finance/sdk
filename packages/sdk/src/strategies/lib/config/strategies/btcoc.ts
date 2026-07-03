import { Env } from '@lombard.finance/sdk-common';
import { Abi } from 'viem';

import { ChainId } from '../../../../common/chains';
import LOMBARD_STRATEGY_ABI from '../../../abi/LOMBARD_STRATEGY_ABI.json';
import { StrategyDefinition } from '../types';

/**
 * BTCoc — the Lombard DeFi Vault Strategy.
 *
 * Multi-asset, async-redeem vault contract that issues ERC-20 shares. Users
 * deposit a supported `depositAsset` (LBTC, BTC.b), receive
 * shares, and later request redemption via `requestRedeem`. The Strategy
 * holds the assets directly and the curator moves funds to Shards for
 * off-chain DeFi execution; the depositor-facing flow does NOT touch shards.
 *
 * Not ERC-4626: the deposit/mint surface takes a `depositAsset` argument and
 * there is no synchronous on-chain redeem path.
 *
 * Deployed in `prod` on Ethereum mainnet (BTCoc) and in `testnet` on Base
 * Sepolia (staging).
 */
export const BTCOC: StrategyDefinition = {
  id: 'btcoc',
  name: 'BTCoc',
  abi: LOMBARD_STRATEGY_ABI as Abi,
  decimals: 8,
  deployments: {
    // Ethereum mainnet (BTCoc / MAWARS-0.0.1). `converter` is resolved
    // on-chain via `converterOf` in getStrategyDepositAssets and is unused by
    // depositStrategy (approval target is the Strategy itself), so it is
    // seeded as the zero address rather than hardcoding a per-asset converter.
    [Env.prod]: {
      chainId: ChainId.ethereum,
      contract: '0xf14F678d9c05798ba61652a950a05D74aD2E0A6C',
      depositAssets: [
        {
          token: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
          symbol: 'BTC.b',
          decimals: 8,
        },
        {
          token: '0x8236a87084f8b84306f72007f36f2618a5634494',
          symbol: 'LBTC',
          decimals: 8,
        },
      ],
    },
    // Base Sepolia staging.
    [Env.stage]: {
      chainId: ChainId.baseSepoliaTestnet,
      contract: '0x14Cd5e82A31A48e0831821FD5FEFdd7f82573348',
      depositAssets: [
        {
          token: '0xd0b479AD08733fd6C63ffdEf3F9c203394699125',
          symbol: 'BTCt',
          decimals: 8,
        },
        {
          token: '0x731eFa688F3679688cf60A3993b8658138953ED6',
          symbol: 'LBTC',
          decimals: 8,
        },
        {
          token: '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58',
          symbol: 'BTC.b',
          decimals: 8,
        },
        {
          token: '0x0a215d8BA66387cA84B284D18C3b4ec3DE6e54A0',
          symbol: 'USDT',
          decimals: 6,
        },
        {
          token: '0x4200000000000000000000000000000000000006',
          symbol: 'wETH',
          decimals: 18,
        },
      ],
    },
  },
};
