import { Abi, Address, zeroAddress } from 'viem';

import { ChainId } from '../../common/chains';
import LOMBARD_STRATEGY_ABI from '../abi/LOMBARD_STRATEGY_ABI.json';
import { IStrategyDepositAssetStatic } from './types';

/**
 * Lombard DeFi Vault Strategy (Bitcoin Stretch and successors).
 *
 * Strategy is a multi-asset, async-redeem vault contract that issues ERC-20
 * shares. Users deposit a supported `depositAsset` (LBTC, BTC.b, USDT, wETH),
 * receive shares, and later request redemption via `requestRedeem`. The
 * Strategy holds the assets directly and the curator moves funds to Shards
 * for off-chain DeFi execution; the depositor-facing flow does NOT touch
 * shards.
 *
 * Not ERC-4626. Do not rely on 4626-only helpers (e.g. wagmi `useReadErc4626`)
 * because the deposit/mint surface takes a `depositAsset` argument and there
 * is no synchronous on-chain redeem path.
 *
 * Deployed on Ethereum mainnet (BTCoc) and Base Sepolia (staging). The SDK
 * must refuse unknown chain ids rather than silently accepting a chain id
 * without a target contract in `LOMBARD_STRATEGY_CONTRACTS`.
 */

export const LOMBARD_STRATEGY_CHAINS = [
  ChainId.ethereum,
  ChainId.baseSepoliaTestnet,
] as const;

export type LombardStrategyChain = (typeof LOMBARD_STRATEGY_CHAINS)[number];

export const isLombardStrategyChain = (
  chainId: number,
): chainId is LombardStrategyChain =>
  LOMBARD_STRATEGY_CHAINS.includes(chainId as LombardStrategyChain);

/**
 * Default canonical Strategy address per supported chain.
 *
 * Multi-strategy is architecturally expected (Strategy is a redeployable
 * template, see `version()` view on the contract). For Bitcoin Stretch
 * specifically, this map keeps the "use this address by default" lookup
 * straightforward. Callers can always pass an explicit `strategy: Address`
 * to any SDK function to target a different deployment of the same template.
 */
export const LOMBARD_STRATEGY_CONTRACTS: Record<LombardStrategyChain, Address> =
{
  // BTCoc (MAWARS-0.0.1), Ethereum mainnet.
  [ChainId.ethereum]: '0xf14F678d9c05798ba61652a950a05D74aD2E0A6C',
  // Bitcoin Stretch, Base Sepolia.
  [ChainId.baseSepoliaTestnet]: '0x14Cd5e82A31A48e0831821FD5FEFdd7f82573348',
};

/**
 * Share-token decimals. The Strategy exposes a `decimals()` view; this
 * constant is the bootstrap default used before the first read and as a
 * sanity check.
 */
export const LOMBARD_STRATEGY_DECIMALS = 8;

/**
 * Static catalog of deposit assets per chain. The Strategy is the source of
 * truth on-chain (`isDepositAsset`, `converterOf`, `depositFee`) but the
 * catalog seeds the UI without an RPC roundtrip and provides the symbol /
 * decimals that the contract does not store for the deposit-side asset.
 */
export const LOMBARD_STRATEGY_DEPOSIT_ASSETS: Record<
  LombardStrategyChain,
  ReadonlyArray<IStrategyDepositAssetStatic>
> = {
  // BTCoc, Ethereum mainnet. `converter` is resolved on-chain via
  // `converterOf` in getStrategyDepositAssets and is unused by depositStrategy
  // (approval target is the Strategy itself), so it is seeded as the zero
  // address rather than hardcoding a per-asset converter here.
  [ChainId.ethereum]: [
    {
      token: '0xB0F70C0bD6FD87dbEb7C10dC692a2a6106817072',
      converter: zeroAddress,
      symbol: 'BTC.b',
      decimals: 8,
    },
    {
      token: '0x8236a87084f8b84306f72007f36f2618a5634494',
      converter: zeroAddress,
      symbol: 'LBTC',
      decimals: 8,
    },
  ],
  [ChainId.baseSepoliaTestnet]: [
    {
      token: '0xd0b479AD08733fd6C63ffdEf3F9c203394699125',
      converter: '0xd3d7EEDf9083C1887725050aFcfBC01c1C10e115',
      symbol: 'BTCt',
      decimals: 8,
    },
    {
      token: '0x731eFa688F3679688cf60A3993b8658138953ED6',
      converter: '0xFAf935d84fC3E3F557a7708F90c0e1b622c12fBF',
      symbol: 'LBTC',
      decimals: 8,
    },
    {
      token: '0x600e4006278EB11FA1691cA0FE6C5fcfC4992d58',
      converter: '0xd3d7EEDf9083C1887725050aFcfBC01c1C10e115',
      symbol: 'BTC.b',
      decimals: 8,
    },
    {
      token: '0x0a215d8BA66387cA84B284D18C3b4ec3DE6e54A0',
      converter: '0x1E606e66F168eD7F2F78Eb49BE4eb14e9d105f69',
      symbol: 'USDT',
      decimals: 6,
    },
    {
      token: '0x4200000000000000000000000000000000000006',
      converter: '0x7CD0d5565F6b04Cfe252f645093421F0396C15DE',
      symbol: 'wETH',
      decimals: 18,
    },
  ],
};

/**
 * Convenience grouping that mirrors the shape used by `BTCE_VAULT` in the
 * Veda vault module, so call sites stay symmetrical.
 */
export const LOMBARD_STRATEGY = {
  abi: LOMBARD_STRATEGY_ABI as Abi,
  decimals: LOMBARD_STRATEGY_DECIMALS,
  chains: LOMBARD_STRATEGY_CHAINS,
  contracts: LOMBARD_STRATEGY_CONTRACTS,
  depositAssets: LOMBARD_STRATEGY_DEPOSIT_ASSETS,
} as const;

export function getDefaultStrategyAddress(
  chainId: LombardStrategyChain,
): Address {
  return LOMBARD_STRATEGY_CONTRACTS[chainId];
}

export function findStaticDepositAsset(
  chainId: LombardStrategyChain,
  asset: Address,
): IStrategyDepositAssetStatic | undefined {
  const lower = asset.toLowerCase();
  return LOMBARD_STRATEGY_DEPOSIT_ASSETS[chainId].find(
    (a) => a.token.toLowerCase() === lower,
  );
}
